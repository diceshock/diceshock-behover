import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/pricing_/$id")({
  component: PricingDetailPage,
});

type PricingPlan = Awaited<
  ReturnType<typeof trpcClientDash.pricingPlansManagement.getById.query>
>;

type Conditions = NonNullable<PricingPlan["conditions"]>;

const PLAN_TYPE_OPTIONS = [
  { value: "yearly", label: "桌面通行证 LTS" },
  { value: "monthly", label: "桌面通行证" },
  { value: "monthly_cc", label: "CC桌面通行证" },
  { value: "stored_value", label: "Table AGENT 储值卡" },
];

const SCOPE_OPTIONS = [
  { value: "boardgame", label: "桌游" },
  { value: "mahjong", label: "日麻" },
  { value: "trpg", label: "跑团" },
  { value: "console", label: "电玩" },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 0, label: "周日" },
];

const MONTHLY_UNIT_OPTIONS = [
  { value: "natural" as const, label: "自然日" },
  { value: "workday" as const, label: "工作日" },
  { value: "holiday" as const, label: "节假日" },
];

function centsToYuan(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

function yuanToCents(yuan: string): number {
  const n = Number.parseFloat(yuan);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function defaultConditions(): Conditions {
  return {
    date: { type: "workdays" },
    time: { type: "all_day" },
    member: { type: "irrelevant" },
    scope: [],
  };
}

function PricingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [conditions, setConditions] = useState<Conditions>(defaultConditions());
  const [billingType, setBillingType] = useState<"hourly" | "fixed">("hourly");
  const [price, setPrice] = useState("");
  const [capUnit, setCapUnit] = useState<"per_day" | "split_day_night">(
    "per_day",
  );
  const [capPrice, setCapPrice] = useState("");
  const [capPriceDay, setCapPriceDay] = useState("");
  const [capPriceNight, setCapPriceNight] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.pricingPlansManagement.getById.query({
        id,
      });
      setPlan(data);
      setName(data.name);
      setConditions(data.conditions ?? defaultConditions());
      setBillingType(data.billing_type);
      setPrice(centsToYuan(data.price));
      setCapUnit(data.cap_unit ?? "per_day");
      setCapPrice(centsToYuan(data.cap_price));
      setCapPriceDay(centsToYuan(data.cap_price_day));
      setCapPriceNight(centsToYuan(data.cap_price_night));
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载计划失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const handleSave = async () => {
    if (!name.trim()) {
      msg.error("请输入计划名称");
      return;
    }
    setSaving(true);
    try {
      await trpcClientDash.pricingPlansManagement.update.mutate({
        id,
        name: name.trim(),
        conditions,
        billing_type: billingType,
        price: yuanToCents(price),
        cap_enabled: billingType === "hourly",
        cap_unit: billingType === "hourly" ? capUnit : null,
        cap_price:
          billingType === "hourly" && capUnit === "per_day"
            ? yuanToCents(capPrice)
            : null,
        cap_price_day:
          billingType === "hourly" && capUnit === "split_day_night"
            ? yuanToCents(capPriceDay)
            : null,
        cap_price_night:
          billingType === "hourly" && capUnit === "split_day_night"
            ? yuanToCents(capPriceNight)
            : null,
      });
      msg.success("已保存到工作区");
      void navigate({ to: "/dash/pricing" });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">计划不存在</p>
        <Link to="/dash/pricing" className="btn btn-primary btn-sm">
          返回价格计划
        </Link>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/pricing" label="返回价格计划" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-20">
          <h1 className="text-2xl font-bold mb-6">编辑条件计划</h1>

          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">计划名称</span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：工作日会员优惠"
                maxLength={50}
              />
            </label>

            <ConditionFormFields
              conditions={conditions}
              setConditions={setConditions}
              billingType={billingType}
              setBillingType={setBillingType}
              price={price}
              setPrice={setPrice}
              capUnit={capUnit}
              setCapUnit={setCapUnit}
              capPrice={capPrice}
              setCapPrice={setCapPrice}
              capPriceDay={capPriceDay}
              setCapPriceDay={setCapPriceDay}
              capPriceNight={capPriceNight}
              setCapPriceNight={setCapPriceNight}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate({ to: "/dash/pricing" })}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "保存中..." : "保存并返回"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </ClientOnly>
  );
}

function OptionCard({
  icon,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all cursor-pointer ${
        selected
          ? "ring-2 ring-primary bg-primary/5"
          : "border border-base-300 hover:border-primary/50"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-base-content/50">{desc}</span>
    </button>
  );
}

function ToggleCard({
  icon,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all cursor-pointer ${
        selected
          ? "ring-2 ring-primary bg-primary/5"
          : "border border-base-300 hover:border-primary/50"
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold">{label}</span>
        {desc && (
          <span className="block text-xs text-base-content/50">{desc}</span>
        )}
      </div>
      <input
        type="checkbox"
        className="checkbox checkbox-sm checkbox-primary"
        checked={selected}
        readOnly
        tabIndex={-1}
      />
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  badge,
  desc,
}: {
  icon: string;
  title: string;
  badge: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-1 mb-1">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        <span className="badge badge-ghost badge-sm">{badge}</span>
      </div>
      <p className="text-xs text-base-content/50">{desc}</p>
    </div>
  );
}

function SubOptions({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-4 pl-4 border-l-2 border-primary/30 mt-2 flex flex-col gap-2">
      {children}
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-base-content/60">{label}</span>
      <div className="join w-full max-w-xs">
        <span className="join-item btn btn-sm no-animation pointer-events-none">
          ¥
        </span>
        <input
          type="number"
          className="join-item input input-bordered input-sm flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={0}
          step={0.01}
        />
      </div>
    </label>
  );
}

function ConditionFormFields({
  conditions,
  setConditions,
  billingType,
  setBillingType,
  price,
  setPrice,
  capUnit,
  setCapUnit,
  capPrice,
  setCapPrice,
  capPriceDay,
  setCapPriceDay,
  capPriceNight,
  setCapPriceNight,
}: {
  conditions: Conditions;
  setConditions: (c: Conditions) => void;
  billingType: "hourly" | "fixed";
  setBillingType: (t: "hourly" | "fixed") => void;
  price: string;
  setPrice: (v: string) => void;
  capUnit: "per_day" | "split_day_night";
  setCapUnit: (u: "per_day" | "split_day_night") => void;
  capPrice: string;
  setCapPrice: (v: string) => void;
  capPriceDay: string;
  setCapPriceDay: (v: string) => void;
  capPriceNight: string;
  setCapPriceNight: (v: string) => void;
}) {
  const updateDate = (date: Conditions["date"]) =>
    setConditions({ ...conditions, date });
  const updateTime = (time: Conditions["time"]) =>
    setConditions({ ...conditions, time });
  const updateMember = (member: Conditions["member"]) =>
    setConditions({ ...conditions, member });
  const updateScope = (scope: string[]) =>
    setConditions({ ...conditions, scope });

  const toggleScope = (val: string) => {
    updateScope(
      conditions.scope.includes(val)
        ? conditions.scope.filter((s) => s !== val)
        : [...conditions.scope, val],
    );
  };

  const togglePlanType = (val: string) => {
    if (conditions.member.type !== "specific") return;
    const pts = conditions.member.planTypes;
    updateMember({
      type: "specific",
      planTypes: pts.includes(val)
        ? pts.filter((p) => p !== val)
        : [...pts, val],
    });
  };

  const toggleWeekday = (day: number) => {
    if (conditions.date.type !== "weekly") return;
    const days = conditions.date.days;
    updateDate({
      type: "weekly",
      days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="card bg-base-200/50">
        <div className="card-body p-4 gap-3">
          <SectionHeader
            icon={"📅"}
            title="日期条件"
            badge="单选"
            desc="选择此计划在哪些日期生效，仅可选一种日期模式"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <OptionCard
              icon={"📌"}
              label="固定日期"
              desc="指定起止月日范围"
              selected={conditions.date.type === "fixed"}
              onClick={() =>
                updateDate({ type: "fixed", start: "01-01", end: "12-31" })
              }
            />
            <OptionCard
              icon={"💼"}
              label="全部工作日"
              desc="排除法定节假日"
              selected={conditions.date.type === "workdays"}
              onClick={() => updateDate({ type: "workdays" })}
            />
            <OptionCard
              icon={"🎉"}
              label="全部节假日"
              desc="法定节假日及调休休息日"
              selected={conditions.date.type === "holidays"}
              onClick={() => updateDate({ type: "holidays" })}
            />
            <OptionCard
              icon={"🔁"}
              label="每周固定"
              desc="每周重复的固定几天"
              selected={conditions.date.type === "weekly"}
              onClick={() =>
                updateDate({ type: "weekly", days: [1, 2, 3, 4, 5] })
              }
            />
            <OptionCard
              icon={"📆"}
              label="每月固定"
              desc="每月第N个工作日/节假日"
              selected={conditions.date.type === "monthly"}
              onClick={() =>
                updateDate({ type: "monthly", nth: 1, unit: "natural" })
              }
            />
          </div>

          {conditions.date.type === "fixed" && (
            <SubOptions>
              <span className="text-xs text-base-content/60">
                指定日期范围 (月-日)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm w-28"
                  placeholder="MM-DD"
                  value={conditions.date.start}
                  onChange={(e) =>
                    updateDate({
                      type: "fixed",
                      start: e.target.value,
                      end:
                        conditions.date.type === "fixed"
                          ? conditions.date.end
                          : "12-31",
                    })
                  }
                />
                <span className="text-sm text-base-content/40">→</span>
                <input
                  type="text"
                  className="input input-bordered input-sm w-28"
                  placeholder="MM-DD"
                  value={conditions.date.end}
                  onChange={(e) =>
                    updateDate({
                      type: "fixed",
                      start:
                        conditions.date.type === "fixed"
                          ? conditions.date.start
                          : "01-01",
                      end: e.target.value,
                    })
                  }
                />
              </div>
            </SubOptions>
          )}

          {conditions.date.type === "weekly" && (
            <SubOptions>
              <span className="text-xs text-base-content/60">
                选择每周生效的日子
              </span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleWeekday(opt.value)}
                    className={`btn btn-xs ${
                      conditions.date.type === "weekly" &&
                      conditions.date.days.includes(opt.value)
                        ? "btn-primary"
                        : "btn-ghost border border-base-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SubOptions>
          )}

          {conditions.date.type === "monthly" && (
            <SubOptions>
              <span className="text-xs text-base-content/60">
                选择每月第几个日子
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">第</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-16"
                  value={
                    conditions.date.type === "monthly" ? conditions.date.nth : 1
                  }
                  onChange={(e) => {
                    if (conditions.date.type !== "monthly") return;
                    updateDate({
                      ...conditions.date,
                      nth: Number(e.target.value),
                    });
                  }}
                  min={1}
                  max={31}
                />
                <span className="text-sm">个</span>
                <select
                  className="select select-bordered select-sm"
                  value={
                    conditions.date.type === "monthly"
                      ? conditions.date.unit
                      : "natural"
                  }
                  onChange={(e) => {
                    if (conditions.date.type !== "monthly") return;
                    updateDate({
                      ...conditions.date,
                      unit: e.target.value as "natural" | "workday" | "holiday",
                    });
                  }}
                >
                  {MONTHLY_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </SubOptions>
          )}
        </div>
      </div>

      <div className="card bg-base-200/50">
        <div className="card-body p-4 gap-3">
          <SectionHeader
            icon={"🕐"}
            title="时间条件"
            badge="单选"
            desc="选择此计划在一天中的哪个时段生效"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <OptionCard
              icon={"🌐"}
              label="全天"
              desc="不限时段"
              selected={conditions.time.type === "all_day"}
              onClick={() => updateTime({ type: "all_day" })}
            />
            <OptionCard
              icon={"☀️"}
              label="白天"
              desc="参考全局时段设置"
              selected={conditions.time.type === "daytime"}
              onClick={() => updateTime({ type: "daytime" })}
            />
            <OptionCard
              icon={"🌙"}
              label="晚上"
              desc="参考全局时段设置"
              selected={conditions.time.type === "nighttime"}
              onClick={() => updateTime({ type: "nighttime" })}
            />
            <OptionCard
              icon={"⏰"}
              label="自定义时段"
              desc="指定起止时间"
              selected={conditions.time.type === "custom"}
              onClick={() =>
                updateTime({ type: "custom", start: "10:00", end: "18:00" })
              }
            />
          </div>

          {conditions.time.type === "custom" && (
            <SubOptions>
              <span className="text-xs text-base-content/60">
                指定生效的时间范围
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="input input-bordered input-sm w-32"
                  value={conditions.time.start}
                  onChange={(e) => {
                    if (conditions.time.type !== "custom") return;
                    updateTime({
                      ...conditions.time,
                      start: e.target.value,
                    });
                  }}
                />
                <span className="text-sm text-base-content/40">→</span>
                <input
                  type="time"
                  className="input input-bordered input-sm w-32"
                  value={conditions.time.end}
                  onChange={(e) => {
                    if (conditions.time.type !== "custom") return;
                    updateTime({
                      ...conditions.time,
                      end: e.target.value,
                    });
                  }}
                />
              </div>
            </SubOptions>
          )}
        </div>
      </div>

      <div className="card bg-base-200/50">
        <div className="card-body p-4 gap-3">
          <SectionHeader
            icon={"👤"}
            title="会员条件"
            badge="单选"
            desc="选择此计划适用的会员类型"
          />
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              icon={"🔓"}
              label="无关"
              desc="不限制会员身份，所有人适用"
              selected={conditions.member.type === "irrelevant"}
              onClick={() => updateMember({ type: "irrelevant" })}
            />
            <OptionCard
              icon={"🚫"}
              label="非会员"
              desc="仅对非会员生效"
              selected={conditions.member.type === "non_member"}
              onClick={() => updateMember({ type: "non_member" })}
            />
            <OptionCard
              icon={"⭐"}
              label="任意会员"
              desc="持有任意会员计划即可"
              selected={conditions.member.type === "any_member"}
              onClick={() => updateMember({ type: "any_member" })}
            />
            <OptionCard
              icon={"🎯"}
              label="特定会员计划"
              desc="限定特定会员计划类型"
              selected={conditions.member.type === "specific"}
              onClick={() => updateMember({ type: "specific", planTypes: [] })}
            />
          </div>

          {conditions.member.type === "specific" && (
            <SubOptions>
              <span className="text-xs text-base-content/60">
                选择适用的会员计划（可多选）
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PLAN_TYPE_OPTIONS.map((opt) => (
                  <ToggleCard
                    key={opt.value}
                    icon={"🪪"}
                    label={opt.label}
                    selected={
                      conditions.member.type === "specific" &&
                      conditions.member.planTypes.includes(opt.value)
                    }
                    onClick={() => togglePlanType(opt.value)}
                  />
                ))}
              </div>
            </SubOptions>
          )}
        </div>
      </div>

      <div className="card bg-base-200/50">
        <div className="card-body p-4 gap-3">
          <SectionHeader
            icon={"🎮"}
            title="营运范围"
            badge="多选"
            desc="选择此计划适用的营运项目，不选择表示全部适用"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ToggleCard
              icon={"🎲"}
              label="桌游"
              desc="桌面游戏"
              selected={conditions.scope.includes("boardgame")}
              onClick={() => toggleScope("boardgame")}
            />
            <ToggleCard
              icon={"🀄"}
              label="日麻"
              desc="日本麻将"
              selected={conditions.scope.includes("mahjong")}
              onClick={() => toggleScope("mahjong")}
            />
            <ToggleCard
              icon={"📖"}
              label="跑团"
              desc="桌上角色扮演"
              selected={conditions.scope.includes("trpg")}
              onClick={() => toggleScope("trpg")}
            />
            <ToggleCard
              icon={"🎮"}
              label="电玩"
              desc="电子游戏"
              selected={conditions.scope.includes("console")}
              onClick={() => toggleScope("console")}
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-200/50">
        <div className="card-body p-4 gap-3">
          <SectionHeader
            icon={"💰"}
            title="计费方式"
            badge="单选"
            desc="选择此计划的计费模式"
          />
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              icon={"🏷️"}
              label="固定费用"
              desc="一口价，不按时间计费"
              selected={billingType === "fixed"}
              onClick={() => setBillingType("fixed")}
            />
            <OptionCard
              icon={"⏱️"}
              label="小时计费"
              desc="按实际使用时长计费"
              selected={billingType === "hourly"}
              onClick={() => setBillingType("hourly")}
            />
          </div>

          <SubOptions>
            <PriceInput
              label={
                billingType === "fixed" ? "固定价格（元）" : "每小时价格（元）"
              }
              value={price}
              onChange={setPrice}
            />

            {billingType === "hourly" && (
              <>
                <span className="text-sm font-semibold mt-2">封顶设置</span>
                <span className="text-xs text-base-content/50">
                  达到封顶价后不再额外计费
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    icon={"📊"}
                    label="按天封顶"
                    desc="每自然日一个封顶额"
                    selected={capUnit === "per_day"}
                    onClick={() => setCapUnit("per_day")}
                  />
                  <OptionCard
                    icon={"🌗"}
                    label="分时段封顶"
                    desc="白天和晚上各有封顶额"
                    selected={capUnit === "split_day_night"}
                    onClick={() => setCapUnit("split_day_night")}
                  />
                </div>
                {capUnit === "per_day" ? (
                  <PriceInput
                    label="封顶价格（元）"
                    value={capPrice}
                    onChange={setCapPrice}
                  />
                ) : (
                  <div className="flex gap-4">
                    <PriceInput
                      label="白天封顶（元）"
                      value={capPriceDay}
                      onChange={setCapPriceDay}
                    />
                    <PriceInput
                      label="晚上封顶（元）"
                      value={capPriceNight}
                      onChange={setCapPriceNight}
                    />
                  </div>
                )}
              </>
            )}
          </SubOptions>
        </div>
      </div>
    </div>
  );
}
