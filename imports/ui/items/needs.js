import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import './needs.html';
import { Items, ItemMethods } from '../../api/items';
import { PurchaseOrders } from '../../api/purchaseorders.js';

var ItemNeeds = new Mongo.Collection('itemNeeds');

FlowRouter.route('/itemNeeds', {
  name: 'itemNeeds',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('itemNeeds');
  }
});

Template.itemNeeds.onCreated(function(){
  this.state = new ReactiveDict();
  this.autorun(function(){
    //FlowRouter.watchPathChange();
    //let id = FlowRouter.getParam('id');
    //Meteor.subscribe('singleItem', id);
    //Meteor.subscribe('itemAliases', id);
    Meteor.subscribe('purchaseorders');
    Meteor.subscribe('itemNeeds');
    Meteor.subscribe('activeRevisions');
    
  })
});

Template.itemNeeds.helpers({
  needs(){
    const arr = Items.find({ needs: { $exists: true, $ne: [] }}, { fields: { _id: 1, number: 1, needs: 1, revision: 1 }}).fetch();
    // Each item could have multiple need lines so we need to reduce this make them separate rows since the dates will likely be different
    var flat = arr.reduce((acc, val) => {
      val.needs.forEach((line)=>{
        line.number = val.number;
        line.revision = val.revision;
        line.itemId = val._id;
      });
      return [...acc, ...val.needs];
    }, []);
    flat.sort((a,b)=>{
      return a.needDate - b.needDate;
    })
    return flat;
  }
});

Template.itemNeeds.events({
  'click .add-need-line': function(event){
    $('.add-dialog').modal('show');
  },
  'submit form.add-line-form': function(event){
    event.preventDefault();
    let d = new Date(event.target.reqDate.value.trim());
    if(isNaN(d.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    ItemMethods.addNeedLine.call({
      number: event.target.number.value.trim(),
      revision: event.target.revision.value.trim(),
      qty: event.target.qty.value.trim(),
      reqDate: d
    }, (err, res) =>{
      if(err)
        alert(err);
      else
        $('.add-dialog').modal('hide');
    })
  },
  'blur [name="number"]': function(event){
    const itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber, isActive: true });
    if(!item){
      $(event.currentTarget).closest('div').find('input[name=revision]').val('');
    }else{
      const rev = item.revision;
      $(event.currentTarget).closest('div').find('input[name=revision]').val(rev);
    }
  },
  'click i#deleteNeedLine': function(event){
    if(confirm('Are you sure you want to delete this line?')){
      const id = $(event.currentTarget).closest('tr').attr('line-id');
      ItemMethods.deleteNeedLine.call({
        id: id
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click i.add-note': function(event){
    const id = $(event.currentTarget).closest('tr').attr('line-id');
    $('.add-note-dialog input#line-id').val(id);
    $('.add-note-dialog').modal('show');
  },
  'submit form.add-note-form': function(event){
    event.preventDefault();
    ItemMethods.addNeedLineNote.call({
      id: $('.add-note-dialog input#line-id').val(),
      note: event.target.note.value.trim()
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.add-note-dialog').modal('hide');
      }
    })
  },
  'click i#deleteNote': function(event){
    if(confirm('Are you sure you want to delete this note?')){
      ItemMethods.deleteNeedLineNote.call({
        id: event.currentTarget.getAttribute('note-id')
      }, (err, res) => {
        if(err)
          alert(err);
      })
    }
  },
  'click i.link-po': function(event){
    //Hide all other related po table rows
    $('tbody').removeClass('show-pos');
    $(event.currentTarget).closest('tbody').addClass('show-pos');
  },
  'click button.link-po': function(event){
    const id = $(event.currentTarget).closest('tr').attr('parent-id');
    $('.link-po-dialog input#line-id').val(id);
    $('.link-po-dialog').modal('show');
  },
  'submit form.link-po-form': function(event){
    event.preventDefault();
    let poNumber = event.target.poNumber.value.trim();
    const id = $('.link-po-dialog input#line-id').val();
    return ItemMethods.linkPoToNeedLine.call({
      id: id,
      poNumber: poNumber
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.link-po-dialog').modal('hide');
      }
    })
  },
  'click i#unlinkPo': function(event){
    if(confirm('Are you sure you want to unlink this PO?')){
      ItemMethods.unlinkPoFromNeedLine.call({
        id: event.currentTarget.getAttribute('link-id')
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click .status-btn': function(event){
    newStatus = event.currentTarget.getAttribute("status");
    // Compare against current status
    // If different call the method to update the status
    ItemMethods.updateNeedLineStatus.call({
      id: event.currentTarget.parentElement.getAttribute('line-id'),
      newStatus: newStatus
    }, (err, res) => {
      if(err)
        alert(err);
    })
    // Otherwise do nothing and close the dropdown
  }
})