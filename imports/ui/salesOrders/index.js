import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { SalesOrders } from '../../api/salesorders.js';

import "./index.html";

FlowRouter.route('/salesOrders/', {
  name: 'salesOrders',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('soIndex');
  }
})

Template.soIndex.onCreated(function(){
  Meteor.subscribe('openSalesOrders');
});

Template.soIndex.helpers({
  orders(){
    return SalesOrders.find({}, { sort: { orderDate: 1 }});
  }
});