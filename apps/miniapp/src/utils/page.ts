interface GuardData {
  busy: boolean;
  error: string;
}

interface PageGuard {
  /** Set on unload; async results must not write into a destroyed page. */
  disposed: boolean;
  /** Runs one task at a time and surfaces its error in `data.error`. */
  run(task: () => Promise<unknown>): Promise<void>;
}

type PageInstance<TData, TCustom> = WechatMiniprogram.Page.Instance<
  TData & GuardData,
  TCustom & PageGuard
>;

type PageOptions<TData, TCustom> = TCustom &
  Partial<WechatMiniprogram.Page.ILifetime> & { data: TData } & ThisType<
    PageInstance<TData, TCustom>
  >;

/**
 * `Page()` with a shared busy/error guard (`data.busy`, `data.error`,
 * `run()`) and an unload flag (`disposed`).
 */
export function definePage<
  TData extends WechatMiniprogram.Page.DataOption,
  TCustom extends WechatMiniprogram.Page.CustomOption,
>(options: PageOptions<TData, TCustom>): void {
  const onUnload = options.onUnload;
  Page<TData & GuardData, TCustom & PageGuard>({
    ...options,
    data: { ...options.data, busy: false, error: "" },
    disposed: false,
    async run(this: PageInstance<TData, TCustom>, task) {
      // setData's Partial<TData> cannot be proven for a generic TData; the
      // guard only touches its own GuardData keys.
      const self = this as unknown as PageInstance<object, object>;
      if (self.data.busy) return;
      self.setData({ busy: true, error: "" });
      try {
        await task();
      } catch (e) {
        if (!self.disposed)
          self.setData({
            error: (e instanceof Error && e.message) || "操作失败，请重试",
          });
      } finally {
        if (!self.disposed) self.setData({ busy: false });
      }
    },
    onUnload(this: PageInstance<TData, TCustom>) {
      this.disposed = true;
      onUnload?.call(this);
    },
  });
}

/** Resolves when the user closes the modal; never rejects. */
export function showModal(
  options: Omit<WechatMiniprogram.ShowModalOption, "success" | "fail">,
): Promise<WechatMiniprogram.ShowModalSuccessCallbackResult | null> {
  // Executor form: Promise.withResolvers is ES2024, beyond the WeChat baseline.
  return new Promise((resolve) =>
    wx.showModal({ ...options, success: resolve, fail: () => resolve(null) }),
  );
}
