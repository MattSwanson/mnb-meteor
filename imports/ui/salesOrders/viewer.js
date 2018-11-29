import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { SalesOrders, SalesOrderMethods } from '../../api/salesorders.js';
import { Items } from '../../api/items.js';

import './viewer.html';
import { O_DIRECT } from 'constants';

Template.soViewer.onCreated(function(){
  console.log("So Viewer onCreate");
  // let id = FlowRouter.getParam('id');
  // Meteor.subscribe('singleSalesOrder', id);
  Meteor.subscribe('activeRevisions');
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
    SalesOrderMethods.updateLineItem.call({
      lineItemId: event.currentTarget.parentElement.getAttribute('line-id'),
      newStatus: event.currentTarget.getAttribute('status')
    }, (err, res) => {
      if(err)
        alert(err);
      else
        return false;
    });
  },
  'click .delete-so': function(event){
    if(confirm('Are you sure you want to delete this order? This cannot be undone!')){
      const id = FlowRouter.getParam('id');
      SalesOrderMethods.delete.call({ id: id }, (err, res) => {
        if(err)
          alert(err);
        else
          FlowRouter.go('/createSo');
      });
    }
  },
  'click .delete-line': function(event){
    if(confirm('Are you sure you want to delete this line? This should only be done if this line was a mistake. If not, close the line instead')){
      const lineId = event.currentTarget.getAttribute('line-id');
      SalesOrderMethods.deleteLineItem.call({ lineId: lineId }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click #add-line-btn': function(event){
    // Pop our form into the last row of the table.
    $('.add-line-dialog').modal('show');
  },
  'blur [name="number"]': function(event){
    let itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber });
    if(!item)
      $(event.currentTarget).closest('div').find('input[name=revision]').val('');
   else
   {
      const rev = item.revision;
      $(event.currentTarget).closest('div').find('input[name=revision]').val(rev);
   }
  },
  'submit form': function(event){
    event.preventDefault();
    const id = FlowRouter.getParam('id');
    const lineItem = {
      number: event.currentTarget.number.value.trim(),
      revision: event.currentTarget.revision.value.trim(),
      reqDate: new Date(event.currentTarget.dueDate.value.trim()),
      qty: event.currentTarget.qty.value.trim()
    };
    SalesOrderMethods.addLineItem.call({
      orderId: id,
      lineItem: lineItem
    }, (err, res) => {
      if(err)
        alert(err);
      else
        $('.add-line-dialog').modal('hide');
    });
  },
})