import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Companies = new Mongo.Collection('companies');

if(Meteor.isServer){
  Meteor.publish('allCompanies', function(){
    console.log('Publishing Companies');
    return Companies.find({}, { sort: { name: 1 }});
  });
}

