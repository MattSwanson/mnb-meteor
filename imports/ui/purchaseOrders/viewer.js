import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { PurchaseOrders } from '../../api/purchaseorders.js';

import './viewer.html';

FlowRouter.route('/purchaseOrders/:id', {
  name: 'salesOrder',
  action(){
    BlazeLayout.render('poViewer');
  }
});

Template.poViewer.onCreated(function(){
  this.autorun(function(){
    FlowRouter.watchPathChange();
    let id = FlowRouter.getParam('id');
    Meteor.subscribe('singlePurchaseOrder', id);
  })
});

Template.poViewer.helpers({
  order(){
    let id = FlowRouter.getParam('id');
    const oid = new Mongo.ObjectID(id);
    return PurchaseOrders.findOne(oid);
  }
});