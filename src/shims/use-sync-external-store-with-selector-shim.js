import {
	useDebugValue,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";

const objectIs = typeof Object.is === "function" ? Object.is : (x, y) => x === y || (x !== x && y !== y);

export function useSyncExternalStoreWithSelector(
	subscribe,
	getSnapshot,
	getServerSnapshot,
	selector,
	isEqual,
) {
	const instRef = useRef(null);
	if (instRef.current === null) {
		instRef.current = { hasValue: false, value: null };
	}

	const [getSelection, getServerSelection] = useMemo(() => {
		let hasMemo = false;
		let memoizedSnapshot;
		let memoizedSelection;
		const maybeGetServerSnapshot = getServerSnapshot === undefined ? null : getServerSnapshot;

		function memoizedSelector(nextSnapshot) {
			if (!hasMemo) {
				hasMemo = true;
				memoizedSnapshot = nextSnapshot;
				const nextSelection = selector(nextSnapshot);
				if (isEqual !== undefined && instRef.current.hasValue && isEqual(instRef.current.value, nextSelection)) {
					memoizedSelection = instRef.current.value;
					return memoizedSelection;
				}
				memoizedSelection = nextSelection;
				return memoizedSelection;
			}

			const currentSelection = memoizedSelection;
			if (objectIs(memoizedSnapshot, nextSnapshot)) {
				return currentSelection;
			}

			const nextSelection = selector(nextSnapshot);
			if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
				memoizedSnapshot = nextSnapshot;
				return currentSelection;
			}

			memoizedSnapshot = nextSnapshot;
			memoizedSelection = nextSelection;
			return memoizedSelection;
		}

		return [
			() => memoizedSelector(getSnapshot()),
			maybeGetServerSnapshot === null ? undefined : () => memoizedSelector(maybeGetServerSnapshot()),
		];
	}, [getSnapshot, getServerSnapshot, selector, isEqual]);

	const value = useSyncExternalStore(subscribe, getSelection, getServerSelection);

	useEffect(() => {
		instRef.current.hasValue = true;
		instRef.current.value = value;
	}, [value]);

	useDebugValue(value);
	return value;
}
