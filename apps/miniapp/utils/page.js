// Keep async results from writing into an unloaded page.
module.exports = {
  async run(task) {
    if (this.data.busy) return;
    this.setData({ busy: true, error: "" });
    try {
      await task();
    } catch (e) {
      if (!this.disposed)
        this.setData({ error: e.message || "操作失败，请重试" });
    } finally {
      if (!this.disposed) this.setData({ busy: false });
    }
  },
  onUnload() {
    this.disposed = true;
  },
};
