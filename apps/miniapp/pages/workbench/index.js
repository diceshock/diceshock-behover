const { graphql } = require('../../services/client');
const op = require('../../services/operations');
const page = require('../../utils/page');
const { sessionView } = require('../../utils/session');
const labels = {pending:'待审核',returned:'已退回',published:'已发布',cancelled:'已流团',completed:'已结团'};
Page({ ...page, data:{busy:false,error:'',profile:null,items:[],hasMore:false,stores:[],storeIndex:0,statusIndex:0,statuses:['全部状态','待审核','已退回','已发布','已流团','已结团']},
 onShow(){this.reload();}, reload(){return this.load(false);}, more(){return this.load(true);},
 load(append){return this.run(async()=>{const offset=append?this.data.items.length:0; const result=await graphql(op.workbench,{filters:{offset,storeId:this.data.stores[this.data.storeIndex]?.id||undefined,status:['', 'pending','returned','published','cancelled','completed'][this.data.statusIndex]||undefined}});if(!result.trpgProfile.canHost)throw new Error('当前账号没有主持或管理权限');if(!this.disposed)this.setData({profile:result.trpgProfile,stores:[{id:'',name:'全部门店'},...result.trpgStores],items:[...(append?this.data.items:[]),...result.trpgSessions.items.map(s=>({...sessionView(s),statusText:labels[s.status]}))],hasMore:result.trpgSessions.hasMore});});},
 filter(e){if(this.data.busy)return;this.setData({[e.currentTarget.dataset.key]:Number(e.detail.value)});this.reload();},
 create(){wx.navigateTo({url:'/pages/host-edit/index'});},
 open(e){wx.navigateTo({url:'/pages/manage-session/index?id='+encodeURIComponent(e.currentTarget.dataset.id)});}
});
