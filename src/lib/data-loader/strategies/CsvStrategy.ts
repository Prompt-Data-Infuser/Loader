import DataLoadStrategy from "../DataLoadStrategy";
import { Meta } from "../../../entity/manager/Meta";
import { QueryRunner } from "typeorm";
import fs from 'fs';
import readline from 'readline';
import FileManager from "../../file-manager/FileManager";

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite');

const MAX_CHUNK_SIZE = 10;
/**
 * CSV 파일을 적재하기 위한 Strategy
 */
class CsvStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }
  
  /**
   * CSV 파일을 읽어 DB에 입력할 데이터를 생성하는 메소드
   * 
   * @param meta Meta 객체
   * @param originalColumnNames 원본 컬럼 명(DBMS가 아닌경우 사용되지 않음)
   */
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async(resolve, reject) => {
      try {
        //const fileStream = fs.createReadStream(meta.filePath); 
        const fileStream = FileManager.Instance.createReadStream(meta.filePath); // 파일매니저를 통해서 스트림 받게 변경
        const iconvStream = iconv.decodeStream(meta.encoding)
        const rl = readline.createInterface({
          input: fileStream.pipe(iconvStream)
        })
        
        let chunks = []
        let lineCount = 0;

        let skip = meta.skip + 1;
        let isFirst = true;
        rl
        .on('error', err => {
          rl.close();
          reject(err);
        })
        .on('line', line => {
          rl.pause();
          if(isFirst && lineCount < skip) {
            lineCount++;
            if(lineCount === skip - 1) isFirst = false;
            rl.resume();
            return;
          }
          chunks.push(line);
          rl.resume();
        })
        .on('close', () => {
          try {
            const csvString = chunks.join('\n');
            const records = parse(csvString);
            resolve(records);
          } catch(err) {
            reject(err);
          }
        })

      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }
}

export default CsvStrategy;