export interface IBaseRepository<T, CreateDto, UpdateDto> {
   findById(id: string): Promise<T | null>;
   create(data: CreateDto): Promise<T>;
   update(id: string, data: UpdateDto): Promise<T>;
   delete(id: string): Promise<boolean | void>;
}
