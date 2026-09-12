/* Snapshot of GET /model1/supported so the scene picker works while Render wakes. */

export const MODEL1_FALLBACK_PAIRS = [
  { image_id: 'demo_0.png', question: 'Does this satellite image include pastures?' },
  { image_id: 'demo_1.png', question: 'Does any coniferous forest lie right up against a mixed forest?' },
  { image_id: 'demo_2.png', question: 'Is there evidence of industrial or commercial units in the image?' },
  { image_id: 'demo_3.png', question: 'Do transitional woodlands or shrubs occupy at least four continuous areas in the image?' },
  { image_id: 'demo_4.png', question: 'Can you identify coniferous forest in the satellite image?' },
  { image_id: 'demo_5.png', question: 'Does this image include exactly three connected zones of marine waters?' },
  { image_id: 'demo_6.png', question: 'Can you detect any permanent crops in the image?' },
  { image_id: 'demo_7.png', question: 'Is there evidence of inland waters in the image?' },
  { image_id: 'demo_8.png', question: 'Do marine waters cover less than the whole image?' },
  { image_id: 'demo_9.png', question: 'Is the land cover type pastures present in the satellite image?' },
  {
    image_id: 'demo_10.png',
    question:
      'Does any instance of land principally occupied by agriculture with significant areas of natural vegetation directly border transitional woodlands or shrubs in this scene?',
  },
  { image_id: 'demo_11.png', question: 'Do inland wetlands appear in over two continuous areas in this image?' },
  { image_id: 'demo_12.png', question: 'Does the image capture complex cultivation patterns?' },
  { image_id: 'demo_13.png', question: 'Is the total area of marine waters between 0% and 10%?' },
  {
    image_id: 'demo_14.png',
    question:
      'Do lands principally occupied by agriculture with significant areas of natural vegetation appear in a maximum of one continuous area within the image?',
  },
  { image_id: 'demo_15.png', question: 'Is there some part of the image not covered by complex cultivation patterns?' },
  { image_id: 'demo_16.png', question: 'Does any arable land lie right up against permanent crops?' },
  { image_id: 'demo_17.png', question: 'Can you identify pastures in the satellite image?' },
  { image_id: 'demo_18.png', question: 'Do broad-leaved forests cover more than 50%?' },
  {
    image_id: 'demo_19.png',
    question:
      'Is the surface of lands principally occupied by agriculture with significant areas of natural vegetation not greater than 288000 square meters?',
  },
  {
    image_id: 'demo_20.png',
    question:
      'Which land cover type can be observed in this image? a) Broad-leaved forest, b) Agro-forestry areas, c) Inland waters, d) Marine waters',
  },
  {
    image_id: 'demo_21.png',
    question:
      'Which pair of classes touch in the satellite image? a) Coastal wetlands and Mixed forest, b) Coniferous forest and Pastures, c) Complex cultivation patterns and Pastures, d) Arable land and Coniferous forest',
  },
  {
    image_id: 'demo_22.png',
    question:
      'From these options, which class can be observed in the image? a) Marine waters, b) Beaches, dunes, sands, c) Complex cultivation patterns, d) Inland waters',
  },
  {
    image_id: 'demo_23.png',
    question: 'Select the country shown in the satellite image: a) Serbia, b) Portugal, c) Kosovo, d) Luxembourg',
  },
  {
    image_id: 'demo_24.png',
    question: 'Which of the following seasons is depicted in the satellite image? a) Summer, b) Spring, c) Autumn, d) Winter',
  },
  {
    image_id: 'demo_25.png',
    question: 'Select the area of inland waters: a) 70 to 80%, b) 50 to 70%, c) 0 to 10%, d) 40 to 50%',
  },
  {
    image_id: 'demo_26.png',
    question:
      'Considering the coniferous forest as a reference, where does the mixed forest appear? a) to the bottom, b) to the bottom-left, c) to the top-left, d) to the right',
  },
  {
    image_id: 'demo_27.png',
    question: 'Choose the country that is shown in the satellite image: a) Austria, b) Belgium, c) Portugal, d) Kosovo',
  },
  {
    image_id: 'demo_28.png',
    question: 'Which country is captured in the satellite image? a) Belgium, b) Lithuania, c) Ireland, d) Kosovo',
  },
  {
    image_id: 'demo_29.png',
    question: 'From the following options, choose the country shown in the image: a) Serbia, b) Portugal, c) Switzerland, d) Finland',
  },
  {
    image_id: 'demo_30.png',
    question:
      'Select the pair that borders each other: a) Coastal wetlands and Complex cultivation patterns, b) Mixed forest and Transitional woodland, shrub, c) Mixed forest and Moors, heathland and sclerophyllous vegetation, d) Coniferous forest and Transitional woodland, shrub',
  },
  {
    image_id: 'demo_31.png',
    question: 'From the options below, select the season shown in the satellite image: a) Spring, b) Autumn, c) Summer, d) Winter',
  },
  {
    image_id: 'demo_32.png',
    question:
      'Which range corresponds to the area covered by arable lands? a) 1008000 to 1152000 m^2, b) 864000 to 1008000 m^2, c) 432000 to 720000 m^2, d) 144000 to 432000 m^2',
  },
  {
    image_id: 'demo_33.png',
    question:
      'Which land cover type can be observed in this image? a) Pastures, b) Broad-leaved forest, c) Mixed forest, d) Moors, heathland and sclerophyllous vegetation',
  },
  {
    image_id: 'demo_34.png',
    question:
      'Select the climate zone shown in the satellite image: a) Cold, no dry season, cold summer, b) Cold, no dry season, hot summer, c) Temperate, no dry season, cold summer, d) Temperate, no dry season, warm summer',
  },
  {
    image_id: 'demo_35.png',
    question: 'Identify the season depicted in the image: a) Autumn, b) Winter, c) Spring, d) Summer',
  },
  {
    image_id: 'demo_36.png',
    question:
      'Identify the class that appears in this satellite image: a) Mixed forest, b) Coniferous forest, c) Broad-leaved forest, d) Coastal wetlands',
  },
  {
    image_id: 'demo_37.png',
    question:
      'What is the spatial direction from the arable land to the urban fabric? a) to the bottom, b) to the top, c) to the bottom-left, d) to the bottom-right',
  },
  {
    image_id: 'demo_38.png',
    question:
      'Identify the climate zone depicted in the satellite image: a) Temperate, no dry season, warm summer, b) Temperate, dry summer, warm summer, c) Temperate, no dry season, cold summer, d) Cold, no dry season, warm summer',
  },
  {
    image_id: 'demo_39.png',
    question:
      'Select the option that corresponds to the climate zone shown in the satellite image: a) Arid, steppe, cold, b) Cold, no dry season, hot summer, c) Temperate, no dry season, warm summer, d) Polar, tundra',
  },
];

export function isModel1Mcq(question) {
  return /\ba\)/i.test(question || '');
}

export function model1SceneLabel(imageId) {
  const n = String(imageId || '').match(/demo_(\d+)/i);
  if (!n) return imageId || 'Scene';
  return `Scene ${String(Number(n[1]) + 1).padStart(2, '0')}`;
}

export function pairForImageId(pairs, imageId) {
  return (pairs || []).find((p) => p.image_id === imageId) || null;
}

export function parseMcqOptions(question) {
  const options = [];
  const re = /([a-d])\)\s*([^]+?)(?=,\s*[a-d]\)|$)/gi;
  let m;
  while ((m = re.exec(question || ''))) {
    options.push({ letter: m[1].toLowerCase(), label: m[2].trim().replace(/[.,;]+$/, '') });
  }
  return options;
}
