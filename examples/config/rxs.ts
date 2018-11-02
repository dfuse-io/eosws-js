import { defer, Observable, of, SubscribableOrPromise, throwError, timer } from "rxjs"
import { concatMap, flatMap, map, retryWhen, take } from "rxjs/operators"

export function retryUntilStrategy<T>(
  observableFactory: () => SubscribableOrPromise<T>,
  onRetry?: () => void,
  onFailure?: () => void
): Observable<T> {
  const delayedError = concatMap((error: Error, index) => {
    return timer(Math.pow(index, 2) * 200).pipe(map(() => error))
  })

  const stopBarrier = flatMap((error: Error, index) => {
    if (index < 4) {
      notifyObserver(onRetry)
      return of(error)
    }

    notifyObserver(onFailure)
    return throwError(error)
  })

  return defer(observableFactory).pipe(
    retryWhen((errors: Observable<Error>) =>
      errors.pipe(
        delayedError,
        take(5),
        stopBarrier
      )
    )
  )
}

function notifyObserver(observer?: () => void) {
  if (observer) {
    observer()
  }
}
