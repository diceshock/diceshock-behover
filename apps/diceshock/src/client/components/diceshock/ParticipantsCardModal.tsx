import { useApolloClient } from "@apollo/client";
import { CopyIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/client/components/modal";
import {
  BusinessCardByUserIdDocument,
  type BusinessCardByUserIdQuery,
  type BusinessCardByUserIdQueryVariables,
  ParticipantBusinessCardsDocument,
  type ParticipantBusinessCardsQuery,
  type ParticipantBusinessCardsQueryVariables,
} from "@/client/graphql/__generated__";
import { useMessages } from "@/client/hooks/useMessages";

type ParticipantsCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeId: string;
};

type ParticipantItem = {
  userId: string;
  nickname: string;
  uid: string | null;
  isWatching: boolean | null;
  sharePhone: boolean;
  phone: string | null;
  wechat: string | null;
  qq: string | null;
  customContent: string | null;
  registrationId: string;
  createdAt: string | null;
};

type BusinessCardDetail = {
  userId: string;
  nickname: string;
  uid: string | null;
  sharePhone: boolean | null;
  phone: string | null;
  wechat: string | null;
  qq: string | null;
  customContent: string | null;
};

function CopyButton({ value }: { value: string }) {
  const messages = useMessages();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs btn-square"
      onClick={() => {
        try {
          navigator.clipboard.writeText(value);
          messages.success("已复制");
        } catch {
          messages.error("复制失败");
        }
      }}
    >
      <CopyIcon className="size-3.5" />
    </button>
  );
}

function CardField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-base-content/5 last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-base-content/50">{label}</span>
        <span className="text-sm break-all">{value}</span>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

export default function ParticipantsCardModal({
  isOpen,
  onClose,
  activeId,
}: ParticipantsCardModalProps) {
  const client = useApolloClient();
  const messages = useMessages();
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [cardDetail, setCardDetail] = useState<BusinessCardDetail | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId(null);
      setCardDetail(null);
      return;
    }

    const fetchParticipants = async () => {
      setLoading(true);
      try {
        const { data } = await client.query<
          ParticipantBusinessCardsQuery,
          ParticipantBusinessCardsQueryVariables
        >({
          query: ParticipantBusinessCardsDocument,
          variables: { activeId },
        });
        const sorted = [...data.participantBusinessCards].sort((a, b) => {
          if (a.isWatching === b.isWatching) return 0;
          return a.isWatching ? 1 : -1;
        });
        setParticipants(sorted as ParticipantItem[]);
      } catch (error) {
        messages.error("获取参与者信息失败");
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [isOpen, activeId, messages, client]);

  const handleSelectUser = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setCardLoading(true);
      try {
        const { data } = await client.query<
          BusinessCardByUserIdQuery,
          BusinessCardByUserIdQueryVariables
        >({
          query: BusinessCardByUserIdDocument,
          variables: { userId, activeId },
        });
        setCardDetail(data.businessCard as BusinessCardDetail);
      } catch (error) {
        messages.error("获取名片失败");
        setCardDetail(null);
      } finally {
        setCardLoading(false);
      }
    },
    [activeId, messages, client],
  );

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) onClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-2xl min-h-96 max-h-[80vh] rounded-xl px-0 pb-0 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-hidden",
          "border border-base-content/30",
        )}
      >
        <div className="flex items-center justify-between px-6 pb-4">
          <h3 className="text-base font-bold">参与者名片</h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <XIcon className="size-4" weight="bold" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : participants.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-12">
            <p className="text-sm text-base-content/50">暂无参与者</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden border-t border-base-content/10">
            <div className="w-48 shrink-0 border-r border-base-content/10 overflow-y-auto">
              {participants.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  className={clsx(
                    "w-full text-left px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-content/5",
                    selectedUserId === p.userId && "bg-base-200",
                  )}
                  onClick={() => handleSelectUser(p.userId)}
                >
                  <p className="text-sm font-medium truncate">{p.nickname}</p>
                  <span
                    className={clsx(
                      "text-xs",
                      p.isWatching ? "text-base-content/40" : "text-primary",
                    )}
                  >
                    {p.isWatching ? "观望" : "参与者"}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedUserId ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-base-content/40">
                    点击左侧列表查看名片
                  </p>
                </div>
              ) : cardLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : cardDetail ? (
                <div className="flex flex-col gap-1">
                  <h4 className="text-lg font-bold mb-2">
                    {cardDetail.nickname}
                  </h4>

                  <CardField label="用户ID" value={cardDetail.userId} />
                  <CardField label="UID" value={cardDetail.uid} />
                  {cardDetail.sharePhone === true && (
                    <CardField label="手机号" value={cardDetail.phone} />
                  )}
                  <CardField label="微信" value={cardDetail.wechat} />
                  <CardField label="QQ" value={cardDetail.qq} />
                  <CardField
                    label="自定义内容"
                    value={cardDetail.customContent}
                  />

                  {!cardDetail.sharePhone &&
                    !cardDetail.wechat &&
                    !cardDetail.qq &&
                    !cardDetail.customContent && (
                      <p className="text-sm text-base-content/40 mt-4">
                        该用户未填写额外联系方式
                      </p>
                    )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-base-content/40">
                    无法加载名片信息
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
