import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const PurchaseOrders = new Mongo.Collection('purchaseorders');

if(Meteor.isServer){
  Meteor.publish('purchaseorders', function(){
    console.log("Publishing Purchase Orders");
    return PurchaseOrders.find({});
  });

  Meteor.publish('openPurchaseOrders', function(){
    return PurchaseOrders.find({
      lineItems: {
        $elemMatch: {
          complete: false
        }
      }
    });
  });

  Meteor.publish('singlePurchaseOrder', function(id){
    const oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find(oid);
  });
}