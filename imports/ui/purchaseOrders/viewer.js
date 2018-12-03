import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Items } from '../../api/items.js';
import { PurchaseOrders, PurchaseOrderMethods } from '../../api/purchaseorders.js';

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
  'click #add-line-btn': function(event){
    $('.add-line-dialog').modal('show');
  },
  'change [name="line-type"]'(event, instance){
    instance.state.set('lineType', event.target.id);
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
    PurchaseOrderMethods.receiveItem.call({
      lineId: lineId,
      recdQty: recdQty,
      recdDate: d
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
      PurchaseOrderMethods.deleteLineItem.call({
        lineId: lineId
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click .delete-po':function(event){
    if(confirm('Are you sure you want to delete this PO? This cannot be undone!')){
      // Call method to delete the line based on id
      const id = FlowRouter.getParam('id');
      PurchaseOrderMethods.delete.call({
        id: id
      }, (err, res) => {
        if(err)
          alert(err);
        else
          FlowRouter.go('/createPo');
      });
    }
  },
  'blur [name="number"]': function(event){
    let itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber });
    if(!item){
      console.log('Invalid item number entered');
      $(event.currentTarget).closest('div').find('input[name=revision]').val('');
    }else{
      const rev = item.revision;
      $(event.currentTarget).closest('div').find('input[name=revision]').val(rev);
    }
  },
  'submit form': function(event, instance){
    event.preventDefault();
    console.log("Submitting add line form");
    const poId = FlowRouter.getParam('id');
    // Gather data from form into object
    let reqDate = new Date(event.target.reqDate.value.trim());
    if(isNaN(reqDate.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    let lineItem = {
      qty: event.target.qty.value.trim(),
      number: event.target.number.value.trim(),
      revision: event.target.revision.value.trim(),
      reqDate: reqDate
    };
    if(Template.instance().state.get('lineType') == 'line-type-process'){
      lineItem.process = event.target.process.value.trim()
    }
    
    PurchaseOrderMethods.addLineItem.call({
      orderId: poId,
      line: lineItem
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.add-line-dialog').modal('hide');
      }
    })
  }
});

Template.poViewer.onCreated(function(){
  this.state = new ReactiveDict();
  this.state.set('lineType', 'line-type-item');
  Meteor.subscribe('activeRevisions');
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
  },
  isProcessLine(){
    const instance = Template.instance();
    return instance.state.get('lineType') == 'line-type-process';
  }
});