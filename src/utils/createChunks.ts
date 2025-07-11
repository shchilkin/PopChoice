import { readFile } from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 0;

export const splitDocument = async (pathToFile: string) => {
  const document = await readFile(pathToFile, 'utf-8');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: DEFAULT_CHUNK_SIZE,
    chunkOverlap: DEFAULT_CHUNK_OVERLAP,
  });
  return await splitter.createDocuments([document]);
};
