import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './viewer.html';
import './partViewer.html';
import './kitViewer.html';
import { Items } from '../../api/items';

FlowRouter.route('/items/:id', {
  name: 'item',
  action(){
    BlazeLayout.render('itemViewer');
  }
});

Template.itemViewer.onCreated(function(){
  this.autorun(function(){
    FlowRouter.watchPathChange();
    let id = FlowRouter.getParam('id');
    Meteor.subscribe('singleItem', id);
    Meteor.subscribe('itemAliases', id);
  })
});

Template.itemViewer.helpers({
  item(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    return Items.findOne({ _id: itemId}, { history: { $slice: 10 } });
  },

  // Get item history which includes it's aliases
  aHistory(){

    // Get this items history
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    const baseItem = Items.findOne({_id: itemId});
    const aliases = baseItem.aliases;
    let history = baseItem.history; //.fetch();
    history.forEach((shipment) => {
      shipment.itemNumber = baseItem.number;
      shipment.itemRevision = baseItem.revision;
    });
    // Step through each alias
    aliases.forEach((alias) => {
      let ai = Items.findOne({_id: alias.refId});
      //  -  get its history
      let aliasHistory = ai.history;
      aliasHistory.forEach((shipment) => {
        shipment.itemNumber = alias.number;
        shipment.itemRevision = alias.revision;
      });
      // Combine all histories into one array
      history = history.concat(aliasHistory);
    });
    // Sort the array by shipment date and then return it to the template
    history.sort((a,b)=>{
      return b.date - a.date;
    });
    
    return history;
  }
})