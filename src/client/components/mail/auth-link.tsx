export default function AuthLink({ url }: { url: string }) {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <title>DiceShock 登录验证</title>
                <meta name="color-scheme" content="light only" />
                <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f2f2f2;
            margin: 0;
            padding: 40px 0;
            color: #000;
          }

          .card {
            background: #fff;
            max-width: 520px;
            margin: 0 auto;
            border-radius: 16px;
            overflow: hidden;
          }

          .header {
            background-color: #9EF8B0;
            color: #000;
            text-align: center;
            padding: 28px 0 20px;
          }

          .logo {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .site-link {
            color: #000;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
          }

          .body {
            padding: 48px 32px 36px;
            text-align: center;
          }

          .title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 16px;
          }

          .desc {
            color: #444;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 32px;
          }

          .button {
            display: inline-block;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 16px;
            letter-spacing: 0.3px;
          }

          .fallback {
            margin-top: 28px;
            font-size: 13px;
            color: #666;
            line-height: 1.6;
          }

          .fallback a {
            color: #000;
            text-decoration: underline;
          }

          .footer {
            border-top: 1px solid #e6e6e6;
            padding: 28px 20px;
            text-align: center;
            font-size: 13px;
            color: #777;
            line-height: 1.7;
          }

          .footer a {
            color: #000;
            font-weight: 500;
            text-decoration: underline;
          }

          @media (max-width: 600px) {
            body {
              padding: 24px 0;
            }
            .body {
              padding: 32px 20px;
            }
          }
        `}</style>
            </head>

            <body>
                <div className="card">
                    <div className="header" style={{ padding: 0 }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                            }}
                        >
                            <tbody>
                                <tr>
                                    <td
                                        style={{
                                            width: 140,
                                            padding: "20px",
                                            textAlign: "left",
                                        }}
                                    >
                                        <img
                                            src="https://assets.diceshock.com/images/diceshock-logo-text.png"
                                            alt="DiceShock"
                                            style={{
                                                width: 140,
                                                height: "auto",
                                            }}
                                        />
                                    </td>
                                    <td
                                        style={{
                                            padding: "20px",
                                            textAlign: "right",
                                        }}
                                    >
                                        <div>
                                            <p
                                                style={{
                                                    textAlign: "right",
                                                    color: "black",
                                                    fontSize: 20,
                                                    fontWeight: "400",
                                                    wordWrap: "break-word",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                DiceShock©骰子奇兵
                                            </p>
                                            <p
                                                style={{
                                                    marginTop: 0,
                                                    textAlign: "right",
                                                    color: "black",
                                                    fontSize: 16,
                                                    fontWeight: "400",
                                                }}
                                            >
                                                跑团 ⚡ 桌游 ⚡ 日麻 ⚡ 主机
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Body */}
                    <div className="body">
                        <h1 className="title">登录验证</h1>
                        <p className="desc">
                            点击下方按钮以验证你的邮箱并完成登录。
                        </p>
                        <a href={url} className="button" target="_blank">
                            验证并登录
                        </a>

                        <div className="fallback">
                            <p>如果按钮无法点击，可复制以下链接：</p>
                            <a href={url}>{url}</a>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="footer">
                        <p>⚠️ 不要回复这是一封自动邮件。</p>
                        <p>如果这不是你的邮箱，请不要点击验证链接。</p>
                        <p>
                            若发现异常行为，请联系{" "}
                            <a href="mailto:feedback@diceshock.com">
                                feedback@diceshock.com
                            </a>{" "}
                            报告。
                        </p>
                        <p>
                            📞 更多帮助请访问{" "}
                            <a href="https://diceshock.com/contact-us">
                                diceshock.com/contact-us
                            </a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
