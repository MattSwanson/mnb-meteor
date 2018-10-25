import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { PurchaseOrders } from '../../api/purchaseorders.js';

import './viewer.html';

Template.registerHelper('todaysDate', () => {
  return new Date().toISOString().substring(0,10);
});

FlowRouter.route('/purchaseOrders/:id', {
  name: 'salesOrder',
  action(){
    BlazeLayout.render('poViewer');
  }
});

Template.poViewer.events({
  'click .rec-btn': function(event, template){
    $('.rec-dialog input#line-id').val(event.currentTarget.getAttribute('line-id'));
    $('.rec-dialog').modal('show');
  },
  'click .save-btn': function(event, template){
    // Get the qty and date from the forms and send them
    // to the server via meteor call
    var recdQty = parseInt($('.rec-dialog input#recd-qty').val());
    if(!Number.isInteger(recdQty)){
      alert("Qty is not a valid integer");
      return;
    }
    var recdDate = $('.rec-dialog input#recd-date').val();
    let d = new Date(recdDate);
    if(isNaN(d.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    const lineId = $('.rec-dialog input#line-id').val();
    Meteor.call('purchaseOrders.receiveItem', {
      lineId: lineId,
      recdQty: recdQty,
      recdDate: recdDate
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.rec-dialog').modal('hide');
        $('.rec-dialog input#recd-qty').val('');
      }
    });
  },
  'click .delete-line':function(event){
    const c = confirm(`Are you sure you want to delete this line?`);
    if(c){
      const lineId = event.currentTarget.getAttribute('line-id');
      Meteor.call('purchaseOrders.deleteLineItem', {
        lineId: lineId
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
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