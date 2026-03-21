mod log;

use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

use crate::log::RotatingLog;

fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            if let Some(&'[') = chars.peek() {
                chars.next();
                while let Some(&next) = chars.peek() {
                    chars.next();
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
        } else if c == '\r' {
            continue;
        } else {
            result.push(c);
        }
    }
    result
}

fn get_terminal_size() -> PtySize {
    let mut ws: libc::winsize = unsafe { std::mem::zeroed() };
    let ret = unsafe { libc::ioctl(libc::STDOUT_FILENO, libc::TIOCGWINSZ, &mut ws) };
    if ret == 0 && ws.ws_row > 0 && ws.ws_col > 0 {
        PtySize {
            rows: ws.ws_row,
            cols: ws.ws_col,
            pixel_width: ws.ws_xpixel,
            pixel_height: ws.ws_ypixel,
        }
    } else {
        PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        }
    }
}

fn resolve_root() -> PathBuf {
    if let Ok(r) = std::env::var("NX_WORKSPACE_ROOT") {
        PathBuf::from(r)
    } else {
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    }
}

fn enable_raw_mode() -> Option<libc::termios> {
    let mut orig: libc::termios = unsafe { std::mem::zeroed() };
    if unsafe { libc::tcgetattr(libc::STDIN_FILENO, &mut orig) } != 0 {
        return None;
    }

    let mut raw = orig;
    unsafe { libc::cfmakeraw(&mut raw) };
    if unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, &raw) } != 0 {
        return None;
    }

    Some(orig)
}

fn restore_terminal(orig: &libc::termios) {
    unsafe {
        libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, orig);
    }
}

fn stdin_is_tty() -> bool {
    unsafe { libc::isatty(libc::STDIN_FILENO) == 1 }
}

enum Mode {
    Dev,
    Run { name: String, cmd: Vec<String> },
    Nx { target: String, extra: Vec<String> },
}

fn parse_args() -> Mode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.is_empty() {
        eprintln!("usage: ty-jk <project:target> [args...]");
        eprintln!("       ty-jk --dev");
        eprintln!("       ty-jk --run <name> <command...>");
        std::process::exit(1);
    }

    match args[0].as_str() {
        "--dev" => Mode::Dev,
        "--run" => {
            if args.len() < 3 {
                eprintln!("usage: ty-jk --run <name> <command...>");
                std::process::exit(1);
            }
            Mode::Run {
                name: args[1].clone(),
                cmd: args[2..].to_vec(),
            }
        }
        _ => Mode::Nx {
            target: args[0].clone(),
            extra: args[1..].to_vec(),
        },
    }
}

fn run_pty(name: &str, cmd: &[String], cwd: &Path, tag: Option<&str>) -> Result<i32> {
    let root = resolve_root();
    let header = cmd.join(" ");
    let mut log = RotatingLog::new(&root, name, Some(&header))?;

    let size = get_terminal_size();
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(size)
        .map_err(|e| anyhow::anyhow!("{}", e))?;

    let mut cmd_builder = CommandBuilder::new(&cmd[0]);
    for arg in &cmd[1..] {
        cmd_builder.arg(arg);
    }
    cmd_builder.cwd(cwd);

    let mut child = pair
        .slave
        .spawn_command(cmd_builder)
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| anyhow::anyhow!("{}", e))?;

    let orig_termios = if stdin_is_tty() {
        enable_raw_mode()
    } else {
        None
    };

    let running = Arc::new(AtomicBool::new(true));

    let winch_flag = Arc::new(AtomicBool::new(false));
    signal_hook::flag::register(libc::SIGWINCH, winch_flag.clone())
        .map_err(|e| anyhow::anyhow!("signal_hook: {}", e))?;

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    let running_stdin = running.clone();
    thread::spawn(move || {
        let mut stdin = io::stdin().lock();
        let mut buf = [0u8; 4096];
        while running_stdin.load(Ordering::Relaxed) {
            match stdin.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if writer.write_all(&buf[..n]).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    let mut buf = [0u8; 8192];
    let mut stdout = io::stdout().lock();

    loop {
        if winch_flag.swap(false, Ordering::Relaxed) {
            let new_size = get_terminal_size();
            let _ = pair.master.resize(new_size);
        }

        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                let bytes = &buf[..n];
                let _ = stdout.write_all(bytes);
                let _ = stdout.flush();

                let text = String::from_utf8_lossy(bytes);
                let clean = strip_ansi(&text);
                if !clean.is_empty() {
                    log.write(&clean);
                }
            }
            Err(e) => {
                if e.raw_os_error() == Some(libc::EIO) {
                    break;
                }
                break;
            }
        }
    }

    if let Some(ref orig) = orig_termios {
        restore_terminal(orig);
    }

    running.store(false, Ordering::Relaxed);

    let status = child.wait().map_err(|e| anyhow::anyhow!("{}", e))?;

    log.end();

    if let Some(t) = tag {
        eprintln!("[{}] exited with code {:?}", t, status.exit_code());
    }

    Ok(status.exit_code() as i32)
}

fn dev_mode() -> Result<()> {
    let root = resolve_root();

    let apps = vec![
        ("diceshock", root.join("apps/diceshock")),
        ("runespark", root.join("apps/runespark")),
    ];

    let mut handles = Vec::new();
    for (name, cwd) in apps {
        let name = name.to_string();
        let cwd = cwd.clone();
        let handle = thread::spawn(move || {
            let cmd = vec!["npx".to_string(), "vite".to_string(), "--host".to_string()];
            run_pty(&name, &cmd, &cwd, Some(&name))
        });
        handles.push(handle);
    }

    for handle in handles {
        if let Ok(result) = handle.join() {
            result?;
        }
    }

    Ok(())
}

fn nx_mode(target: &str, extra: &[String]) -> Result<i32> {
    let root = resolve_root();
    let name = target.replace(':', "-");
    let mut cmd = vec![
        "npx".to_string(),
        "nx".to_string(),
        "run".to_string(),
        target.to_string(),
    ];
    cmd.extend(extra.iter().cloned());

    run_pty(&name, &cmd, &root, None)
}

fn cmd_mode(name: &str, cmd: &[String]) -> Result<i32> {
    let root = resolve_root();
    run_pty(name, cmd, &root, None)
}

fn main() -> Result<()> {
    let mode = parse_args();
    let code = match mode {
        Mode::Dev => {
            dev_mode()?;
            0
        }
        Mode::Run { name, cmd } => cmd_mode(&name, &cmd)?,
        Mode::Nx { target, extra } => nx_mode(&target, &extra)?,
    };
    std::process::exit(code);
}
