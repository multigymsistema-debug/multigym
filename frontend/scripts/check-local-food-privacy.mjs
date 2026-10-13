import {readFile} from 'node:fs/promises';

const component=await readFile(new URL('../src/nutrigym.tsx',import.meta.url),'utf8');
const vision=await readFile(new URL('../src/localFoodVision.ts',import.meta.url),'utf8');
const forbidden=[
  '/student-api/nutrigym/meals/analyze',
  '/student-api/nutrigym/meals/vision',
  '/student-api/nutrigym/meals/estimate-food',
];
for(const endpoint of forbidden){
  if(component.includes(endpoint))throw new Error(`Photo feature must not call ${endpoint}`);
}
if(!component.includes('suggestFoodsFromPhoto(data)'))throw new Error('Photo suggestions are not using the local classifier.');
if(!component.includes("studentPost('/student-api/nutrigym/meals',{meal_date:date,meal_time:new Date().toTimeString().slice(0,5),meal_type:mealType,description})")){
  throw new Error('Meal save payload must contain only date, time, meal type and confirmed text description.');
}
if(/https?:\/\//i.test(vision))throw new Error('The local model module must not depend on external inference or model endpoints.');
if(!vision.includes("'/models/mobilenetv2-12-int8.onnx'")||!vision.includes("'/models/synset.txt'"))throw new Error('The ONNX model and labels must be served by this portal.');
console.log('Local photo privacy checks passed: no image upload or external inference endpoints in the photo feature.');
