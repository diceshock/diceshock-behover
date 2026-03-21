use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

const MAX_LINES: usize = 20_000;
const MAX_TRASH: usize = 15;

fn timestamp() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn agents_dir(root: &Path) -> PathBuf {
    root.join(".agents")
}

fn trash_dir(root: &Path) -> PathBuf {
    agents_dir(root).join("trash")
}

pub struct RotatingLog {
    file: File,
    line_count: usize,
    start_line: usize,
    name: String,
    last_content: String,
    repeat_count: usize,
    root: PathBuf,
}

impl RotatingLog {
    pub fn new(root: &Path, name: &str, header: Option<&str>) -> anyhow::Result<Self> {
        let agents = agents_dir(root);
        let trash = trash_dir(root);
        fs::create_dir_all(&agents)?;
        fs::create_dir_all(&trash)?;

        archive_existing(&agents, &trash);
        prune_trash(&trash);

        let placeholder = build_file_name(name, 1, 0);
        let path = agents.join(&placeholder);
        let file = File::create(&path)?;

        let mut log = Self {
            file,
            line_count: 0,
            start_line: 1,
            name: name.to_string(),
            last_content: String::new(),
            repeat_count: 0,
            root: root.to_path_buf(),
        };

        if let Some(hdr) = header {
            log.write_line(&format!("[{}] > {}", timestamp(), hdr));
        }

        Ok(log)
    }

    pub fn write(&mut self, text: &str) {
        let lines: Vec<&str> = text.split('\n').collect();
        for (i, line) in lines.iter().enumerate() {
            if i == lines.len() - 1 && line.is_empty() {
                continue;
            }

            if *line == self.last_content {
                self.repeat_count += 1;
            } else {
                self.flush_pending();
                self.last_content = line.to_string();
                self.repeat_count = 1;
            }
        }
    }

    pub fn end(&mut self) {
        self.flush_pending();
        self.finalize_file_name();
    }

    fn flush_pending(&mut self) {
        if self.repeat_count == 0 {
            return;
        }
        let ts = timestamp();
        if self.repeat_count == 1 {
            let formatted = format!("[{}] {}", ts, self.last_content);
            self.write_line(&formatted);
        } else {
            let formatted = format!("[{}] {} [x{}]", ts, self.last_content, self.repeat_count);
            self.write_line(&formatted);
        }
        self.repeat_count = 0;
    }

    fn write_line(&mut self, formatted: &str) {
        let _ = writeln!(self.file, "{}", formatted);
        self.line_count += 1;
        if self.line_count >= MAX_LINES {
            self.rotate();
        }
    }

    fn finalize_file_name(&self) {
        let end_line = self.start_line + self.line_count.saturating_sub(1);
        let old_name = build_file_name(&self.name, self.start_line, 0);
        let new_name = build_file_name(
            &self.name,
            self.start_line,
            if self.line_count > 0 { end_line } else { 0 },
        );
        let agents = agents_dir(&self.root);
        let _ = fs::rename(agents.join(&old_name), agents.join(&new_name));
    }

    fn rotate(&mut self) {
        self.finalize_file_name();
        let _ = self.file.flush();

        self.start_line += self.line_count;
        self.line_count = 0;

        let placeholder = build_file_name(&self.name, self.start_line, 0);
        let path = agents_dir(&self.root).join(&placeholder);
        if let Ok(f) = File::create(&path) {
            self.file = f;
        }
    }
}

impl Drop for RotatingLog {
    fn drop(&mut self) {
        self.end();
    }
}

fn build_file_name(name: &str, start: usize, end: usize) -> String {
    format!("output-{}-{}-{}.log", name, start, end)
}

fn archive_existing(agents: &Path, trash: &Path) {
    if let Ok(entries) = fs::read_dir(agents) {
        for entry in entries.flatten() {
            let fname = entry.file_name();
            let fname_str = fname.to_string_lossy();
            if fname_str.starts_with("output-") && fname_str.ends_with(".log") {
                let _ = fs::rename(entry.path(), trash.join(&*fname_str));
            }
        }
    }
}

fn prune_trash(trash: &Path) {
    if let Ok(entries) = fs::read_dir(trash) {
        let mut files: Vec<(String, std::time::SystemTime)> = entries
            .flatten()
            .filter_map(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                if name.ends_with(".log") {
                    e.metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .map(|mtime| (name, mtime))
                } else {
                    None
                }
            })
            .collect();

        files.sort_by(|a, b| b.1.cmp(&a.1));

        for (name, _) in files.iter().skip(MAX_TRASH) {
            let _ = fs::remove_file(trash.join(name));
        }
    }
}
