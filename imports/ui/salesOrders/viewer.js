import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { SalesOrders } from '../../api/salesorders.js';

import './viewer.html';

Template.soViewer.onCreated(function(){
  console.log("So Viewer onCreate");
  // let id = FlowRouter.getParam('id');
  // Meteor.subscribe('singleSalesOrder', id);

  this.autorun(function(){
    FlowRouter.watchPathChange();
    console.log('Path has changed in sales over viewer');
    let id = FlowRouter.getParam('id');
    Meteor.subscribe('singleSalesOrder', id);
  })
});

Template.soViewer.onRendered(function(){
  console.log("So Viewer onRendered");
});

Template.soViewer.helpers({
  order(){
    
    let id = FlowRouter.getParam('id');
    const oid = new Mongo.ObjectID(id);
    return SalesOrders.findOne(oid);
  }
});

Template.soViewer.events({
  'click .status-btn': function(event){
    Meteor.call('salesOrders.updateLineItem', {
      lineItemId: event.currentTarget.parentElement.getAttribute('line-id'),
      newStatus: event.currentTarget.getAttribute('status')
    }), (err, res) => {
      if(err)
        alert(err);
      else
        return false;
    }
  }
})