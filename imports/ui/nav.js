import './nav.html';
import { SearchIndex } from '../api/search.js';

SearchResults = new Mongo.Collection(null);

Template.nav.onCreated(function(){
  Meteor.subscribe('searchIndex');
});

Template.nav.events({
  'keyup .search-input': function(event, template){
    if(event.target.value == ''){
      SearchResults.remove({});
      return;
    }
    let reg = '^'+event.target.value;
    let results = SearchIndex.find({ name: { $regex: reg} }, { limit: 5 }).fetch();
    if(results.length > 0){
      SearchResults.remove({});
      results.forEach((res)=>{
        SearchResults.insert(res);
      });
    }else if(results.length >= 0){
      SearchResults.remove({});
    }
  },
  'click .search-results a': function(event, template){
    SearchResults.remove({});
    template.find('.search-input').value = '';
  }
});

Template.nav.helpers({
  searchResults(){
    return SearchResults.find({});
  },
  hasResults(){
    return (SearchResults.find({}).count() > 0);
  },
  createResultUrl(type){
    url = '/';
    switch(type){
      case 'Sales Order':
        url += 'salesOrders/'; break;
      case 'Purchase Order':
        url += 'purchaseOrders/'; break;
    }
    return url;
  }
});