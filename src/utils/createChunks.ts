import { readFile } from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const splitDocument = async (pathToFile: string) => {
  const document = await readFile(pathToFile, 'utf-8');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
  });
  return await splitter.createDocuments([document]);
};
