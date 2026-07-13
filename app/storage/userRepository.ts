import type { UserData } from "../domain/models";
import { readUserData, writeUserData } from "./userData";
export interface UserRepository{load():UserData;save(data:UserData):boolean}
export class LocalStorageUserRepository implements UserRepository{constructor(private readonly storage?:Storage){}load(){return readUserData(this.storage).data}save(data:UserData){return writeUserData(data,this.storage)}}
