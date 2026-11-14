Component({
  properties: { session: Object },
  methods: {
    open() {
      wx.navigateTo({
        url: `/pages/session/index?id=${encodeURIComponent(this.data.session.id)}`,
      });
    },
  },
});
