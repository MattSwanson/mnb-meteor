import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { PurchaseOrders } from '../../api/purchaseorders.js';

import './index.html';

FlowRouter.route('/purchaseOrders/', {
  name: 'purchaseOrders',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('poIndex');
  }
})
Template.poIndex.onCreated(function(){
  Meteor.subscribe('openPurchaseOrders');
});

Template.poIndex.helpers({
  orders(){
    return PurchaseOrders.find({}, { sort: { orderDate: 1 }});
  }
});