import { SalesOrders } from '../imports/api/salesorders.js';

export function generateSearchIndex(){
  console.log("Generating the search index...");
  SearchIndex._dropCollection();
  
  //Search Index will be a mongocollection with all fields
  //available to search for
  
  // Each record will have:
  // name - this will be what is displayed on the search result
  // type - is the result a po, order or item?
  // recordId - the id of this item from its original collection
  // keywords - things that can also be searched on past the name

  // The search should primary go by name and then by keyword

  // To fill the index, go through each collection that should
  // be searched through

  // This collection will be published to the clients and then 
  // searched on from there

  // Get items from:
  // Salesorders
  let salesOrders = SalesOrders.find({}).fetch().map((doc)=>{
    return {
      name: doc.custOrderNumber,
      type: 'Sales Order',
      recordId: doc._id
    };
  });
  salesOrders.forEach((doc)=>{
    SearchIndex.insert(doc);
  });
  // Purchase Orders
  // Items
  
}



