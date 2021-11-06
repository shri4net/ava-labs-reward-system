import level from 'level'

//namespace EventIndexerCore {

  export class AppGlobal {
    private static _instance: AppGlobal;
    private static _dbpath:string = './.db/db-idx';
    
    db: level.LevelDB<any, any>
    dbRO: level.LevelDB<any, any>
    private constructor() {
      console.log(`Event Indexer database is at ${AppGlobal._dbpath}`)
      this.db = level(AppGlobal._dbpath, {keyEncoding: 'utf8', valueEncoding: 'json'})
      this.dbRO = this.db //level(AppGlobal._dbpath, {keyEncoding: 'utf8', valueEncoding: 'json', readOnly: true})
    }

    static instance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new AppGlobal();
        return this._instance;
    }
  }

//}

