import { Meteor } from 'meteor/meteor';
import { generateSearchIndex } from './search.js';

import '../imports/api/salesorders.js';
import '../imports/api/search.js';


Meteor.startup(() => {
  // code to run on server at startup
  //generateSearchIndex();
});
