import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/client/components/modal";
import trpcClientPublic from "@/shared/utils/trpc";

interface GszRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (
    gszName: string,
    gszSynced: boolean,
    nicknameSynced: boolean,
  ) => void;
  onSkip: () => void;
  phone: string | null;
  nickname: string;
}

type Step = "phone_verify" | "confirm_register";

export default function GszRegistrationModal({
  isOpen,
  onClose,
  onRegistered,
  onSkip,
  phone: existingPhone,
  nickname,
}: GszRegistrationModalProps) {
  const needsPhone = !existingPhone;
  const [step, setStep] = useState<Step>(
    needsPhone ? "phone_verify" : "confirm_register",
  );
  const [phone, setPhone] = useState(existingPhone ?? "");
  const [smsCode, setSmsCode] = useState("");
  const [gszName, setGszName] = useState(nickname);
  const [syncNickname, setSyncNickname] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<{
    gszName: string;
    gszSynced: boolean;
    nicknameSynced: boolean;
  } | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep(needsPhone ? "phone_verify" : "confirm_register");
      setPhone(existingPhone ?? "");
      setSmsCode("");
      setGszName(nickname);
      setSyncNickname(true);
      setError(null);
      setWarning(null);
      setPendingRegistration(null);
      setLoading(false);
    }
  }, [isOpen, needsPhone, existingPhone, nickname]);

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const timer = setInterval(() => setSmsCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [smsCooldown]);

  const handleSendSms = useCallback(async () => {
    if (!phone.trim() || smsSending) return;
    setSmsSending(true);
    setError(null);
    try {
      const result = await trpcClientPublic.auth.smsCode.mutate({
        phone: phone.trim(),
        botcheck: null,
      });
      if (!result.success) {
        setError((result as { message?: string }).message ?? "发送失败");
        return;
      }
      setSmsCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setSmsSending(false);
    }
  }, [phone, smsSending]);

  const handlePhoneVerified = useCallback(() => {
    if (!phone.trim() || !smsCode.trim()) return;
    setStep("confirm_register");
  }, [phone, smsCode]);

  const handleRegister = useCallback(async () => {
    if (!gszName.trim()) {
      setError("请输入昵称");
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const result = await trpcClientPublic.mahjong.register.mutate({
        phone: phone.trim(),
        smsCode: needsPhone ? smsCode.trim() : "0",
        gszName: gszName.trim(),
        syncNickname,
      });
      if (result.registered) {
        if (result.gszSynced === false) {
          setPendingRegistration({
            gszName: result.gszName ?? gszName.trim(),
            gszSynced: false,
            nicknameSynced:
              "nicknameSynced" in result ? result.nicknameSynced : false,
          });
          setWarning(
            "立直麻将账户暂时无法同步，不影响正常游戏。如需同步立直麻将成绩，请联系店员处理。",
          );
        } else {
          onRegistered(
            result.gszName ?? gszName.trim(),
            true,
            "nicknameSynced" in result ? result.nicknameSynced : false,
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }, [gszName, phone, smsCode, needsPhone, syncNickname, onRegistered]);

  return (
    <Modal isCloseOnClick isOpen={isOpen} onToggle={() => onClose()}>
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-100 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
          "border border-base-content/30",
        )}
      >
        <div className="flex items-center justify-between px-4 pb-3 border-b border-base-content/10">
          <h3 className="text-lg font-bold">
            {step === "phone_verify" ? "验证手机号" : "立直麻将注册"}
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-square"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-4 flex flex-col gap-4">
          {error && (
            <div className="alert alert-error alert-soft text-sm py-2">
              <span>{error}</span>
            </div>
          )}
          {warning && (
            <div className="alert alert-warning alert-soft text-sm py-2">
              <span>{warning}</span>
            </div>
          )}

          {step === "phone_verify" && (
            <>
              <p className="text-sm text-base-content/60">
                参加立直麻将需要绑定手机号
              </p>
              <label className="form-control">
                <div className="label">
                  <span className="label-text text-sm">手机号</span>
                </div>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                />
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="验证码"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  maxLength={6}
                />
                <button
                  type="button"
                  className="btn btn-outline shrink-0"
                  disabled={!phone.trim() || smsSending || smsCooldown > 0}
                  onClick={handleSendSms}
                >
                  {smsSending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : smsCooldown > 0 ? (
                    `${smsCooldown}s`
                  ) : (
                    "发送验证码"
                  )}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={!phone.trim() || !smsCode.trim()}
                onClick={handlePhoneVerified}
              >
                下一步
              </button>
            </>
          )}

          {step === "confirm_register" && (
            <>
              {pendingRegistration ? (
                <>
                  <p className="text-sm text-base-content/60">
                    注册已完成，可以正常参加对局。
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => {
                      onRegistered(
                        pendingRegistration.gszName,
                        pendingRegistration.gszSynced,
                        pendingRegistration.nicknameSynced,
                      );
                    }}
                  >
                    我知道了，继续游戏
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-base-content/60">
                    确认你的立直麻将昵称
                  </p>
                  <label className="form-control">
                    <div className="label">
                      <span className="label-text text-sm">立直麻将昵称</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="请输入昵称"
                      value={gszName}
                      onChange={(e) => setGszName(e.target.value)}
                      maxLength={20}
                    />
                  </label>
                  <label className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={syncNickname}
                      onChange={(e) => setSyncNickname(e.target.checked)}
                    />
                    <span className="label-text text-sm">
                      同步使用立直麻将昵称作为 Diceshock 昵称
                    </span>
                  </label>
                  {existingPhone && (
                    <div className="text-xs text-base-content/40">
                      绑定手机号: {existingPhone}
                    </div>
                  )}
                  {!existingPhone && phone && (
                    <div className="text-xs text-base-content/40">
                      绑定手机号: {phone}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={loading || !gszName.trim()}
                    onClick={handleRegister}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "确认注册"
                    )}
                  </button>
                  {needsPhone && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm w-full"
                      onClick={() => setStep("phone_verify")}
                    >
                      返回修改手机号
                    </button>
                  )}
                  {error && (
                    <>
                      <div className="text-xs text-base-content/50 text-center">
                        你也可以稍后前往
                        <Link
                          to="/me"
                          className="link link-primary mx-1"
                          onClick={onClose}
                        >
                          个人中心
                        </Link>
                        完成绑定
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm w-full text-base-content/50"
                        onClick={onSkip}
                      >
                        跳过注册，继续游戏
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
