import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Items } from './items';
import { SimpleSchema } from 'simpl-schema/dist/SimpleSchema';

export const SalesOrders = new Mongo.Collection('salesorders');

export const SalesOrderMethods = {
  updateLineItem: new ValidatedMethod({
    name: 'salesOrders.updateLineItem',
    validate: new SimpleSchema({
      lineItemId: String,
      newStatus: String
    }).validator(),
    run({ lineItemId, newStatus }){
      id = new Mongo.ObjectID(lineItemId);
      SalesOrders.update({
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, {
          $set: { "lineItems.$.status" : newStatus }
      });
    }
  })
};

if(Meteor.isServer){
  Meteor.publish('salesorders', function salesOrdersPublication(){
    console.log("Publishing sales orders");
    return SalesOrders.find({});
  });

  Meteor.publish('openSalesOrders', function (){
    console.log("Publishing Open Line Items");
    return SalesOrders.find({
      lineItems: {
        $elemMatch: {
          status: { $in: ['Open', 'In Production', 'Waiting', 'Ready'] }
        }
      }
    }, {
      _id: 0,
      lineItems: 1
    });
  });

  Meteor.publish('singleSalesOrder', function(id){
    check(id, String);
    const oid = new Mongo.ObjectID(id);
    return SalesOrders.find(oid);
  });

  //TODO We need to update this to account for item aliases 
  Meteor.publish('salesOrdersContainingItems', function(id){
    check(id, String);
    console.log('Publishing Sales Orders Containing Items');

    // Get og item
    const itemId = new Mongo.ObjectID(id);
    const item = Items.findOne({ _id: itemId });
    let allIds = [itemId];
    if(item.aliases){
      allIds = item.aliases.reduce((acc, val) => {
        acc.push(val.refId);
        return acc;
      }, allIds);
    };

    // Check for aliases
    const items = Items.find({ _id: { $in: allIds }}, {_id: 0, 'usedIn.refId': 1, 'usedIn.quantityUsed': 1}).fetch();

    //var kitsIn = Items.find({ _id: new Mongo.ObjectID(id) }, {_id: 0, 'usedIn.refId': 1, 'usedIn.quantityUsed': 1}).fetch();
    let kitsIds = [];
    items.forEach((item) => {
      if(item.usedIn){
        kitsIds = item.usedIn.reduce((acc, val) => {
          acc.push(val.refId);
          return acc;
        }, kitsIds);
      }
    });
    // if(kitsIn[0].usedIn){
    //   kitsIds = kitsIn[0].usedIn.reduce((acc,val)=>{
    //     acc.push(val.refId);
    //     return acc;
    //   }, []);
    // }
    
    return SalesOrders.find({
      lineItems:{
        $elemMatch:{
          'item.refId': { $in: kitsIds },
          status: { $in: ["Open", "Waiting"]}
        }
      }
    });
  });
}