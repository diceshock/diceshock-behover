import { useApolloClient, gql } from "@apollo/client";
import { produce } from "immer";
import { ShieldCheckIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import { addPhoneSchema, removePhoneSchema } from "./admin-phones.store";

const ADMIN_PHONES_QUERY = gql`
  query AdminPhones {
    adminPhones
  }
`;

const SEND_SMS_CODE = gql`
  mutation SendSmsCode($input: SendSmsCodeInput!) {
    sendSmsCode(input: $input) {
      success
      message
    }
  }
`;

const ADD_ADMIN_PHONE = gql`
  mutation AddAdminPhone($input: AdminPhoneInput!) {
    addAdminPhone(input: $input)
  }
`;

const REMOVE_ADMIN_PHONE = gql`
  mutation RemoveAdminPhone($input: AdminPhoneInput!) {
    removeAdminPhone(input: $input)
  }
`;

export const Route = createFileRoute("/dash/admin-phones")({
  component: AdminPhonesPage,
});

function AdminPhonesPage() {
  const msg = useMsg();
  const client = useApolloClient();
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [addForm, setAddForm] = useState({ phone: '', smsCode: '' });
  const updateAddForm = (recipe: (draft: { phone: string; smsCode: string }) => void) =>
    setAddForm(produce(recipe));
  const [smsSent, setSmsSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);

  // Remove form state
  const [removeForm, setRemoveForm] = useState({ phone: '', removeCode: '' });
  const updateRemoveForm = (recipe: (draft: { phone: string; removeCode: string }) => void) =>
    setRemoveForm(produce(recipe));
  const [removeSmsSent, setRemoveSmsSent] = useState(false);

  const fetchPhones = useCallback(async () => {
    try {
      const { data } = await client.query({
        query: ADMIN_PHONES_QUERY,
        fetchPolicy: "network-only",
      });
      setPhones(data.adminPhones);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [client, msg]);

  useEffect(() => {
    void fetchPhones();
  }, [fetchPhones]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(addForm.phone)) {
      msg.error("请输入正确的手机号");
      return;
    }
    setSending(true);
    try {
      const { data } = await client.mutate({
        mutation: SEND_SMS_CODE,
        variables: { input: { phone: addForm.phone } },
      });
      if (data?.sendSmsCode?.success) {
        setSmsSent(true);
        msg.success("验证码已发送");
      } else {
        msg.error(data?.sendSmsCode?.message || "发送失败");
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = addPhoneSchema.safeParse(addForm);
    if (!result.success) {
      msg.error(result.error.issues[0]?.message ?? "表单验证失败");
      return;
    }
    setAdding(true);
    try {
      const { data } = await client.mutate({
        mutation: ADD_ADMIN_PHONE,
        variables: { input: { phone: result.data.phone, code: result.data.smsCode } },
      });
      setPhones(data.addAdminPhone);
      setAddForm({ phone: '', smsCode: '' });
      setSmsSent(false);
      msg.success("管理员手机号已添加");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSendCode = async (phone: string) => {
    updateRemoveForm((draft) => { draft.phone = phone; });
    setSending(true);
    try {
      const { data } = await client.mutate({
        mutation: SEND_SMS_CODE,
        variables: { input: { phone } },
      });
      if (data?.sendSmsCode?.success) {
        setRemoveSmsSent(true);
        msg.success("验证码已发送");
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = removePhoneSchema.safeParse(removeForm);
    if (!result.success) {
      msg.error(result.error.issues[0]?.message ?? "表单验证失败");
      return;
    }
    try {
      const { data } = await client.mutate({
        mutation: REMOVE_ADMIN_PHONE,
        variables: { input: { phone: result.data.phone, code: result.data.removeCode } },
      });
      setPhones(data.removeAdminPhone);
      setRemoveForm({ phone: '', removeCode: '' });
      setRemoveSmsSent(false);
      msg.success("管理员手机号已移除");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "移除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-200/50 pb-20">

      <div className="mx-auto w-full max-w-lg px-4">
        <h1 className="flex items-center gap-2 text-xl font-bold mt-4 mb-6">
          <ShieldCheckIcon className="size-6" weight="duotone" />
          管理员手机号
        </h1>

        {/* Current admin phones */}
        <div className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body p-4">
            <h2 className="card-title text-sm">当前管理员</h2>
            {phones.length === 0 ? (
              <p className="text-base-content/60 text-sm">暂无管理员手机号</p>
            ) : (
              <ul className="space-y-2">
                {phones.map((phone) => (
                  <li
                    key={phone}
                    className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2"
                  >
                    <span className="font-mono text-sm">
                      {phone.slice(0, 3)}****{phone.slice(-4)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleRemoveSendCode(phone)}
                      disabled={sending}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Remove confirmation */}
        {removeForm.phone && removeSmsSent && (
          <form onSubmit={handleRemove}>
            <div className="card bg-warning/10 border border-warning shadow-sm mb-6">
              <div className="card-body p-4">
                <h2 className="card-title text-sm">
                  确认移除 {removeForm.phone.slice(0, 3)}****{removeForm.phone.slice(-4)}
                </h2>
                <p className="text-xs text-base-content/60">
                  已向该手机号发送验证码，输入后确认移除
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input input-bordered input-sm flex-1"
                    placeholder="6位验证码"
                    value={removeForm.removeCode}
                    onChange={(e) => updateRemoveForm((draft) => { draft.removeCode = e.target.value; })}
                  />
                  <button
                    type="submit"
                    className="btn btn-error btn-sm"
                    disabled={removeForm.removeCode.length !== 6}
                  >
                    确认移除
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setRemoveForm({ phone: '', removeCode: '' });
                      setRemoveSmsSent(false);
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Add new admin phone */}
        <form onSubmit={handleAdd}>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h2 className="card-title text-sm">添加管理员手机号</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    className="input input-bordered input-sm flex-1"
                    placeholder="手机号"
                    value={addForm.phone}
                    onChange={(e) => updateAddForm((draft) => { draft.phone = e.target.value; })}
                    disabled={smsSent}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSendCode}
                    disabled={sending || smsSent || addForm.phone.length !== 11}
                  >
                    {sending ? "发送中..." : "发送验证码"}
                  </button>
                </div>

                {smsSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="input input-bordered input-sm flex-1"
                      placeholder="6位验证码"
                      value={addForm.smsCode}
                      onChange={(e) => updateAddForm((draft) => { draft.smsCode = e.target.value; })}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={adding || addForm.smsCode.length !== 6}
                    >
                      {adding ? "添加中..." : "确认添加"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSmsSent(false);
                        setAddForm({ phone: '', smsCode: '' });
                      }}
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
