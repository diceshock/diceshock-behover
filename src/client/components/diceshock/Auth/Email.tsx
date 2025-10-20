import { signIn } from "@hono/auth-js/react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import z from "zod";

export default function EmailAuth() {
    const [email, setEmail] = useState("");

    const isEmailValid = useMemo(
        () => z.email().or(z.literal("")).safeParse(email).success,
        [email]
    );

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                signIn("resend", { email });
            }}
            className="w-full h-full flex flex-col items-center gap-6 px-4"
        >
            <fieldset className="fieldset w-full">
                <input
                    required
                    type="email"
                    value={email}
                    aria-label="email"
                    placeholder="电子邮件地址"
                    autoComplete="email"
                    className={clsx("input input-lg w-full", {
                        "input-error": !isEmailValid,
                    })}
                    onChange={(e) => setEmail(e.target.value)}
                />

                {!isEmailValid && (
                    <p className="text-error text-xs">请输入有效的邮箱</p>
                )}
            </fieldset>

            <button
                disabled={!isEmailValid || !email}
                className="btn btn-primary mt-auto ml-auto"
            >
                注册/登陆
            </button>
        </form>
    );
}
