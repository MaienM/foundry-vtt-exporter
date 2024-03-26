import { ClassicLevel } from 'classic-level';

/**
 * Readonly copy of a FoundryVTT database.
 *
 * The database may already be opened by FoundryVTT itself, which causes several issues.
 *
 * The first is that the database is locked and the underlying LevelDB library will not let us open it a second time. As a workaround we copy the entire database and remove the lock in this copy, which will then enable us to open this copy.
 *
 * The second is that some of the changes may not yet be in the manifest. To resolve this we run a repair operation to apply any pending operations in the log to the manifest, and then a compact to clean up any items that are no longer needed. This is pretty much the same procedure that would be applies when loading a database after an application crash, so it should work out in most cases.
 */
class BaseDatabase<T> {
	/** The LevelDatabase instance for the (unlocked) copy of the database. */
	#db: ClassicLevel;

	protected constructor(db: ClassicLevel) {
		this.#db = db;
	}

	/**
	 * Async constructor.
	 */
	protected async init() {
		//
	}

	/**
	 * Construct and {@see init}ialize an instance of this class.
	 */
	static async create<T, D extends BaseDatabase<T>>(db: ClassicLevel): Promise<D> {
		const inst = new this(db) as D;
		await inst.init();
		return inst;
	}

	/**
	 * Iterate over the entries in the database.
	 */
	async *values(): AsyncGenerator<T> {
		for await (const rawEntry of this.#db.values()) {
			yield JSON.parse(rawEntry) as T;
		}
	}
}
export default BaseDatabase;

/**
 * Type for a subclass of BaseDatabase.
 */
// dprint-ignore
export type DatabaseClass<D> =
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	D extends BaseDatabase<infer _>
		? D & {
			create(db: ClassicLevel): Promise<D>;
		}
		: never;
