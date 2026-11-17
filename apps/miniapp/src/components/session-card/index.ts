import type { SessionView } from "../../utils/session";

Component({
  properties: { session: Object },
  methods: {
    open() {
      const session = this.data.session as SessionView;
      wx.navigateTo({
        url: `/pages/session/index?id=${encodeURIComponent(session.id)}`,
      });
    },
  },
});
