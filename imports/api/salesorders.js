import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const SalesOrders = new Mongo.Collection('salesorders');

if(Meteor.isServer){
  Meteor.publish('salesorders', function salesOrdersPublication(){
    console.log("Publishing sales orders");
    return SalesOrders.find({});
  });

  Meteor.publish('openLineItems', function (){
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
}