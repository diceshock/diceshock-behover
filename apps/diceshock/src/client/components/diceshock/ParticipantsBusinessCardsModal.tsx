import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useEffect, useState } from "react";
import Modal from "@/client/components/modal";
import trpcClientPublic from "@/shared/utils/trpc";

type ParticipantsBusinessCardsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeId: string;
};

export default function ParticipantsBusinessCardsModal({
  isOpen,
  onClose,
  activeId,
}: ParticipantsBusinessCardsModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<
    Array<{
      user_id: string;
      nickname: string;
      uid: string;
      share_phone: boolean;
      phone: string | null;
      wechat: string | null;
      qq: string | null;
      custom_content: string | null;
      registration_id: string;
      create_at: Date;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchParticipants = async () => {
      try {
        setIsLoading(true);
        const data =
          await trpcClientPublic.businessCard.getParticipantsBusinessCards.query({
            active_id: activeId,
          });
        setParticipants(data);
      } catch (error) {
        console.error("获取参与者名片失败", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [isOpen, activeId]);

  const selectedParticipant = participants?.find(
    (p) => p.user_id === selectedUserId,
  );

  return (
    <>
      <Modal isCloseOnClick isOpen={isOpen} onToggle={onClose}>
        <div
          className={clsx(
            "modal-box max-w-none md:max-w-2xl min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
            "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
            "border border-base-content/30",
          )}
        >
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle absolute top-4 right-4 z-10"
          >
            <XIcon className="size-4" weight="bold" />
          </button>

          <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
            参与者名片
          </h3>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 左侧参与者列表 */}
            <div className="w-1/3 border-r border-base-300 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-sm"></span>
                </div>
              ) : participants && participants.length > 0 ? (
                <div className="p-2">
                  {participants.map((participant) => (
                    <button
                      key={participant.user_id}
                      onClick={() => setSelectedUserId(participant.user_id)}
                      className={clsx(
                        "w-full text-left p-3 rounded-lg mb-2 transition-colors",
                        selectedUserId === participant.user_id
                          ? "bg-primary text-primary-content"
                          : "bg-base-200 hover:bg-base-300",
                      )}
                    >
                      <div className="font-semibold">{participant.nickname}</div>
                      <div className="text-xs opacity-70">
                        UID: {participant.uid}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-base-content/50">
                  暂无参与者
                </div>
              )}
            </div>

            {/* 右侧名片详情 */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedParticipant ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold mb-2">
                      {selectedParticipant.nickname}
                    </h4>
                    <div className="text-sm text-base-content/70">
                      UID: {selectedParticipant.uid}
                    </div>
                  </div>

                  {selectedParticipant.share_phone && selectedParticipant.phone && (
                    <div>
                      <div className="text-sm font-semibold mb-1">手机号码</div>
                      <div className="text-base">{selectedParticipant.phone}</div>
                    </div>
                  )}

                  {selectedParticipant.wechat && (
                    <div>
                      <div className="text-sm font-semibold mb-1">微信号码</div>
                      <div className="text-base">{selectedParticipant.wechat}</div>
                    </div>
                  )}

                  {selectedParticipant.qq && (
                    <div>
                      <div className="text-sm font-semibold mb-1">QQ号码</div>
                      <div className="text-base">{selectedParticipant.qq}</div>
                    </div>
                  )}

                  {selectedParticipant.custom_content && (
                    <div>
                      <div className="text-sm font-semibold mb-1">自定义内容</div>
                      <div className="text-base whitespace-pre-wrap">
                        {selectedParticipant.custom_content}
                      </div>
                    </div>
                  )}

                  {!selectedParticipant.share_phone &&
                    !selectedParticipant.wechat &&
                    !selectedParticipant.qq &&
                    !selectedParticipant.custom_content && (
                      <div className="text-base-content/50 text-center py-8">
                        该用户未填写名片信息
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  请选择左侧参与者查看名片
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
