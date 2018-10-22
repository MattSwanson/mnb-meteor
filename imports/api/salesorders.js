import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Items } from './items';

export const SalesOrders = new Mongo.Collection('salesorders');

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
          status: 'Open'
        }
      }
    }, {
      _id: 0,
      lineItems: 1
    });
  });

  Meteor.publish('singleSalesOrder', function(id){
    const oid = new Mongo.ObjectID(id);
    return SalesOrders.find(oid);
  });

  Meteor.publish('salesOrdersContainingItems', function(id){
    console.log('Publishing Sales Orders Containing Items');
    var kitsIn = Items.find({ _id: new Mongo.ObjectID(id) }, {_id: 0, 'usedIn.refId': 1, 'usedIn.quantityUsed': 1}).fetch();
    kitsIds = kitsIn[0].usedIn.reduce((acc,val)=>{
      acc.push(val.refId);
      return acc;
    }, []);
    return SalesOrders.find({
      lineItems:{
        $elemMatch:{
          'item.refId': { $in: kitsIds },
          status: { $in: ["Open", "Waiting"]}
        }
      }
    });
  });

  Meteor.methods({
    'salesOrders.updateLineItem'({ lineItemId, newStatus }){
      id = new Mongo.ObjectID(lineItemId);
      SalesOrders.update({
        lineItems: {
            $elemMatch: { _id: id }
          }
        }, {
          $set: { "lineItems.$.status" : newStatus }
        });
      }
  });
}