/**
 * OpenArabDict
 * Copyright (C) 2025 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import "acts-util-core";
import { OpenArabDictDocument, OpenArabDictVerb, OpenArabDictVerbDerivationType, OpenArabDictWordParentType } from "openarabdict-domain";
import { CreateVerbFromOADVerb, DialectTree } from "openarabdict-openarabicconjugation-bridge";
import { DialectType } from "openarabicconjugation/dist/Dialects";
import { Conjugator } from "openarabicconjugation/dist/Conjugator";
import { CompareVocalized, ParseVocalizedText } from "openarabicconjugation/dist/Vocalization";
import { Letter } from "openarabicconjugation/dist/Definitions";
import { ModernStandardArabicStem1ParametersType } from "openarabicconjugation/dist/dialects/msa/conjugation/r2tashkil";

interface VerbalNounGenerationRecord
{
    rootRadicals: string;
    stem: number;
    stemParameters: string;
    verbalNounIndex: number;
}

async function CollectVerbalNouns()
{
    const buffer = await fs.promises.readFile("../builder/dist/en.json");
    const document = JSON.parse(buffer.toString("utf-8")) as OpenArabDictDocument;

    DialectTree.DefineMultiple(document.dialects);

    const conjugator = new Conjugator();

    const data: VerbalNounGenerationRecord[] = [];
    for (const word of document.words)
    {
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = document.words.find(x => x.id === verbId)! as OpenArabDictVerb;
            const root = document.roots.find(x => x.id === verb.rootId)!;

            const verbInstance = CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);
            if(conjugator.HasPotentiallyMultipleVerbalNounForms(verbInstance))
            {
                const parsed = ParseVocalizedText(word.text);
                const generated = conjugator.GenerateAllPossibleVerbalNouns(verbInstance);
                for(let i = 0; i < generated.length; i++)
                {
                    if(CompareVocalized(parsed, generated[i]) === 1)
                    {
                        data.push({
                            rootRadicals: root.radicals,
                            stem: verbInstance.stem,
                            stemParameters: (verbInstance.stem === 1) ? verbInstance.stemParameterization : "",
                            verbalNounIndex: i
                        });
                    }
                }
            }
        }
    }

    return data;
}

const radicals = [
    "",
    Letter.Hamza, Letter.Ba, Letter.Ta, Letter.Tha, Letter.Jiim, Letter.Hha, Letter.Kha, Letter.Dal, Letter.Thal, Letter.Ra, Letter.Zay, Letter.Siin, Letter.Shiin, Letter.Saad, Letter.Daad, Letter.Tta, Letter.Ththa,
    Letter.A3ein, Letter.Ghain, Letter.Fa, Letter.Qaf, Letter.Kaf, Letter.Lam, Letter.Mim, Letter.Nun, Letter.Ha, Letter.Waw, Letter.Ya
];
function RootRadicalToIndex(letter: string)
{
    const index = radicals.indexOf(letter);
    if(index === -1)
        throw new Error(letter);
    return index;
}

const stemParams = [
    "",
    ModernStandardArabicStem1ParametersType.IrregularHayiya,
    ModernStandardArabicStem1ParametersType.IrregularRa2a,
    ModernStandardArabicStem1ParametersType.PastA_PresentA,
    ModernStandardArabicStem1ParametersType.PastA_PresentI,
    ModernStandardArabicStem1ParametersType.PastA_PresentU,
    ModernStandardArabicStem1ParametersType.PastI_PresentA,
    ModernStandardArabicStem1ParametersType.PastI_PresentI,
    ModernStandardArabicStem1ParametersType.PastU_PresentU,
];
function StemParametersToIndex(params: string)
{
    const index = stemParams.indexOf(params);
    if(index === -1)
        throw new Error(params);
    return index;
}

const stemsCount = 10;
const inputDim = (4 * radicals.length) + stemsCount + stemParams.length;
function EncodeExample(record: VerbalNounGenerationRecord)
{
    const result = new Float32Array(inputDim);
    let offset = 0;

    //one-hot encoding
    for(let i = 0; i < 4; i++)
    {
        const index = RootRadicalToIndex(record.rootRadicals.charAt(i));
        result[offset + index] = 1;
        offset += radicals.length;
    }

    result[offset + record.stem - 1] = 1; //make it a zero-based index
    offset += stemsCount;

    result[StemParametersToIndex(record.stemParameters)] = 1;

    return result;
}

function BuildSamples(records: VerbalNounGenerationRecord[])
{
    const xsData = new Float32Array(records.length * inputDim);
    for(let i = 0; i < records.length; i++)
    {
        const x = EncodeExample(records[i]);
        xsData.set(x, i * inputDim);
    }

    return tf.tensor2d(xsData, [records.length, inputDim], "float32");
}

function BuildModel(verbalNounPatternsCount: number)
{
    const input = tf.input({shape: [inputDim]});
  
    let x = tf.layers.dense({units: 128, activation: 'relu'}).apply(input);
    x = tf.layers.dropout({rate: 0.2}).apply(x);
    x = tf.layers.dense({units: 64, activation: 'relu'}).apply(x);
  
    const output = tf.layers.dense({
        units: verbalNounPatternsCount,
        activation: 'softmax'
    }).apply(x);

  const model = tf.model({ inputs: input, outputs: output as any });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy', // since ys are integer labels
    metrics: ['accuracy']
  });

  return model;
}

async function PredictVerbalNoun(record: VerbalNounGenerationRecord, model: tf.LayersModel)
{
    const x = EncodeExample(record);
    const xt = tf.tensor2d(x, [1, inputDim]);
    const prediction = model.predict(xt) as tf.Tensor<tf.Rank>;
    const probs = (await prediction.data());
    prediction.dispose();
    xt.dispose();
  
    // argmax
    let bestIdx = 0;
    for (let i = 1; i < probs.length; i++)
    {
        if (probs[i] > probs[bestIdx])
            bestIdx = i;
    }
  
    return bestIdx;
}

async function TrainModel(trainingData: VerbalNounGenerationRecord[], verbalNounPatternsCount: number)
{
    const trainingDataInput = BuildSamples(trainingData);
    const trainingDataLabels = tf.tensor1d(trainingData.map(x => x.verbalNounIndex), "float32");

    const model = BuildModel(verbalNounPatternsCount);
    model.summary();
    
    const history = await model.fit(trainingDataInput, trainingDataLabels, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
            onEpochEnd(epoch, logs: any) {
                console.log(
                    `Epoch ${epoch + 1}: ` +
                    `loss=${logs.loss.toFixed(4)}, ` +
                    `acc=${logs.acc?.toFixed(4)}, ` +
                    `val_acc=${logs.val_acc?.toFixed(4)}`
                );
            }
        }
    });

    return model;
}

function ShuffleArray<T>(array: T[])
{
    let currentIndex = array.length;
    
    while (currentIndex > 0)
    {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

async function ValidateModel(testData: VerbalNounGenerationRecord[], model: tf.LayersModel)
{
    let correct = 0;
    for (const example of testData)
    {
        const predicted = await PredictVerbalNoun(example, model);
        if(predicted === example.verbalNounIndex)
            correct++;
    }

    console.log("Correct:", Math.round(correct / testData.length * 100) + "%");
}

async function Main()
{
    const verbalNouns = await CollectVerbalNouns();
    ShuffleArray(verbalNouns);
    const maxVerbalNounIndex = Math.max(...verbalNouns.map(x => x.verbalNounIndex));

    const splitIndex = Math.round(verbalNouns.length * 8 / 10);
    const trainingData = verbalNouns.slice(0, splitIndex);
    const testData = verbalNouns.slice(splitIndex);

    const model = await TrainModel(trainingData, maxVerbalNounIndex+1);

    await ValidateModel(testData, model);
    await ValidateModel(trainingData, model);
}

Main();