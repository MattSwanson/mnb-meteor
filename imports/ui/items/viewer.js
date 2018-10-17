import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './viewer.html';
import './partViewer.html';
import './kitViewer.html';
import { Items } from '../../api/items';
import { SalesOrders } from '../../api/salesorders';

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
    // Get all sales orders with open lines containing kits using the item
    Meteor.subscribe('salesOrdersContainingItems', id);
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
  },

  neededForKits(){
    // Since we have subscribed to a list of all sales orders which contain open lines
    // for kits which contain the item we are interested in, we can use that information
    // to calculate how many total pcs are needed to fulfill kit orders and show each line

    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);

    // Get a list of all ids of kits which the item is used in
    let item = Items.findOne({ _id: itemId });
    var kitIds = item.usedIn.reduce((acc, val) => {
      acc.push(val.refId);
      return acc;
    }, []);
    // Make an array of key value pairs keyed by the id of the kit and the value will be the qty of the item
    // used in the kit - for later use
    const qtys = item.usedIn.reduce((acc, val) => {
      acc[val.refId.toHexString()] = val.quantityUsed;
      return acc;
    }, []);
    // Make sure we are only getting the sales orders we want (should be all we have access to right now...)
    salesOrders = SalesOrders.find({
      lineItems: {
        $elemMatch: {
          'item.refId': {
            $in: kitIds
          },
          status: {
            $in: ["Open", "Waiting"]
          }
        }
      }
    }).fetch();
    // Convert our ids to hex string for future use
    kitIds = kitIds.map( (val) => { return val.toHexString(); } );
    // Reduce our sales orders down to just the lines containing kits containing our item !
    var lines = salesOrders.reduce((acc, val) => {
      val.lineItems.forEach((lineItem, index) => {
        // This should be able to refactored into one line but I couldn't get it to work properly
        // When the following two lines are nested in the comparisons? So here we are...
        // Make it work and then make it work better...
        var refIdStr = lineItem.item.refId.toHexString();
        var t = kitIds.indexOf(refIdStr);
        var s = ['Open', 'Waiting'].indexOf(lineItem.status);
        if((t > -1) && (s > -1)){ 
          lineItem.custOrderNumber = val.custOrderNumber;
          lineItem.refId = val._id;
          lineItem.totalQtyNeeded = qtys[refIdStr] * lineItem.qty;
          acc.push(lineItem);
        }
      });
      return acc;
    }, []);
    return lines;
  }
})