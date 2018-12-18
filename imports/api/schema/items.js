import SimpleSchema from 'simpl-schema';

// This schema is used for places where references to other items are used
export const simpleItemSchema = new SimpleSchema({
  number: String,
  revision: String,
  simpleDescription: String,
  refId: Object,
  'refId._str': String
});