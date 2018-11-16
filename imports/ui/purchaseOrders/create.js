import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { PurchaseOrders, PurchaseOrderMethods } from '../../api/purchaseorders.js';
import { Companies } from '../../api/companies.js';
import { Items } from '../../api/items.js'

import './create.html';

FlowRouter.route('/createPo', {
  name: 'createPo',
  action(){
    BlazeLayout.render('createPo');
  }
});

Template.createPo.onCreated(function(){
  this.state = new ReactiveDict();
  this.state.set('orderType', 'order-type-items');
  Meteor.subscribe('activeRevisions');
  Meteor.subscribe('allCompanies');
});

Template.createPo.helpers({
  isProcessOrder(){
    const instance = Template.instance();
    return instance.state.get('orderType') == 'order-type-process';
  },
  companies(){
    return Companies.find();
  }
});

Template.createPo.events({
  'change [name="order-type"]'(event, instance){
    instance.state.set('orderType', event.target.id);
  },
  'click #add-line-btn': function(event){
    const tableBody = $(' .po-items-table tbody');
    const instance = Template.instance();
    if(instance.state.get('orderType') == 'order-type-process')
      Blaze.render(Template.poProcessRow, tableBody[0]);
    else
      Blaze.render(Template.poItemRow, tableBody[0]);
  },
  'click #remove-line-btn': function(){
    $(' .po-line-row').last().remove();
  },
  'submit form'(event, instance){
    event.preventDefault();
    let orderDate = new Date(event.target.orderDate.value.trim());
    if(isNaN(orderDate.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    const isProcessOrder = (instance.state.get('orderType') == 'order-type-process');
    const companyId = new Mongo.ObjectID(event.target.vendor.value);
    const companyName = Companies.findOne({ _id: companyId }).name;
    let po = {
      number: event.target.poNumber.value.trim(),
      shipVia: event.target.shipVia.value.trim(),
      terms: event.target.terms.value.trim(),
      orderDate: orderDate,
      vendor:{
        refId: companyId,
        name: companyName
      },
      lineItems: []
    }
    $('.po-line-row').map((index, element) => {
      const itemNumber = $(element).find('input[name=number]').val().trim();
      const revision = $(element).find('input[name=revision]').val().trim();
      const item = Items.findOne({ number: itemNumber, revision: revision });
      let itemObj = {
        number: itemNumber,
        revision: revision,
        refId: item._id,
        simpleDescription: item.simpleDescription
      };
      let lineItem = {
        uom: 'pc',
        reqDate: new Date($(element).find('input[name=expected-date]').val().trim()),
        qty: $(element).find('input[name=total-qty]').val().trim()
      };
      if(isProcessOrder){
        lineItem.targetItem = itemObj;
        lineItem.process = $(element).find('input[name=process]').val().trim();
      }else{
        lineItem.item = itemObj;
      }
      po.lineItems.push(lineItem);
    });
    //console.log(po);
    // Validate info
    // Bottle it all into a PO object
    // Make the call to Meteor passing the PO
    PurchaseOrderMethods.create.call(po, (err, res) => {
      if(err){
        if(err.error === "po-exists")
          alert('An order with that PO number already exists');
        else
          alert(err.message);
        return;
      }else{
        FlowRouter.go(`/purchaseOrders/${res._str}`);
      }
    });
    // Check result 

    // If success go to the po viewer for our new PO
    // Otherwise display error message 
  },
  'blur [name="number"]': function(event){
    let itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber });
    if(!item){
      console.log('Invalid item number entered');
      $(event.currentTarget).closest('tr').find('input[name=revision]').val('');
    }else{
      const rev = item.revision;
      $(event.currentTarget).closest('tr').find('input[name=revision]').val(rev);
    }
  }
});