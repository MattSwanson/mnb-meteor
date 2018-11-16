import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';

import './kitEntry.html';
import { Items, ItemMethods } from '../../api/items';
import { EventEmitter } from 'events';

FlowRouter.route('/kitEntry', {
  name: 'kitEntry',
  action(){
    BlazeLayout.render('kitEntry');
  }
});

Template.kitEntry.onCreated(function(){
  // Get all active item revisions so we can auto fill the correct rev 
  Meteor.subscribe('activeRevisions');
});

Template.kitEntry.events({
  'submit form': function(event){
    event.preventDefault();
    let contentArray = [];
    $('.line-item-row').map((i, e)=>{
      const itemNumber = e.cells[1].lastChild.value;
      const revision = e.cells[2].lastChild.value;
      const item = Items.findOne({ number: itemNumber, revision: revision });
      let lineItem = {
        uom: "pc",
        qty: e.cells[0].lastChild.value,
        item: {
          number: itemNumber,
          revision: revision,
          simpleDescription: item.simpleDescription,
          refId: item._id
        }
      }
      let bag = e.cells[3].lastChild.value;
      let bagIndex = contentArray.findIndex((e) => {
        return e.bagName == bag;
      });
      if(bagIndex === -1){
        contentArray.push({
          bagName: bag,
          items:[
            lineItem
          ]
        });
      }else{
        contentArray[bagIndex].items.push(lineItem);
      }
    });
    let specialInstructions = [];
    $('.spec-inst-input').map((i,e)=>{
      let trimedStr = e.value.trim();
      if(trimedStr != '')
        specialInstructions.push(trimedStr);
    });
    let effDate = new Date(event.target.effDate.value);
    if(isNaN(effDate.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    let item = {
      number: event.target.number.value.trim(),
      revision: event.target.kitRevision.value.trim(),
      effectiveDate: effDate,
      isActive: true,
      specialInstructions: specialInstructions,
      kit:{
        cartonQty: 1,
        carton: "9x9x9x",
        packaging: "3x3 zip",
        name: event.target.name.value.trim(),
        contents: contentArray
      },
      simpleDescription: event.target.name.value.trim()
    }
    console.log(item);
    ItemMethods.createKit.call(item, (err, res) => {
      if(err){
        if(err.error === "item-revision-exists")
          alert('That item revision already exists');
        else
          alert(err.message);
        return;
      }else{
        FlowRouter.go(`/items/${res._str}`);
      }
    });
    //Complete!
  },
  'click #add-line-item-btn': function(event){
    let tableBody = $(' .kit-line-items-table tbody');
    Blaze.render(Template.kitEntryTableRow, tableBody[0]);
  },
  'click #remove-line-item-btn': function(){
    $(' .line-item-row').last().remove();
  },
  'click #add-spec-inst-btn': function(){
    let div = $(' .special-instrunctions-entry ');
    Blaze.render(Template.specialInstLine, div[0]);
  },
  'click #remove-spec-inst-btn': function(){
    $(' .spec-inst-input').last().remove();
  },
  'blur [name="item-number"]': function(event){
    let itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber });
    if(!item){
      // Not a valid item number - invalidate the item number input
      console.log('Invalid item number entered');
      event.currentTarget.closest('tr').cells[2].lastChild.value = '';
    }else{
      // We have a matching item number - populate the rev field
      // with it's current active revision
      const rev = item.revision;
      event.currentTarget.closest('tr').cells[2].lastChild.value = rev;
    }
  }
});