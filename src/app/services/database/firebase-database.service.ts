// import { Injectable, inject } from '@angular/core';
// import {
//   Firestore,
//   doc,
//   setDoc,
//   getDoc,
//   onSnapshot,
//   collection,
//   query,
//   getDocs,
//   deleteDoc
// } from '@angular/fire/firestore';
// import { Observable, from } from 'rxjs';
// import { UserProgress, CustomExercise } from '../../models/exercise.model';
// import { UserAchievementData } from '../../models/achievement.model';
// import { IDatabase, FavoriteData, UserProfile, UserRewards, UnsubscribeFunction } from './database.interface';

// /**
//  * Firebase implementation of the database interface
//  */
// @Injectable({
//   providedIn: 'root'
// })
// export class FirebaseDatabase implements IDatabase {
//   private firestore = inject(Firestore);

//   // User Profile Operations
//   saveUserProfile(userId: string, profile: UserProfile): Observable<void> {
//     const userRef = doc(this.firestore, `users/${userId}`);
    
//     return from(
//       getDoc(userRef).then(snapshot => {
//         if (snapshot.exists()) {
//           // Update only lastLogin if user exists
//           return setDoc(userRef, { lastLogin: new Date() }, { merge: true });
//         } else {
//           // Create new user profile
//           return setDoc(userRef, profile);
//         }
//       })
//     );
//   }

//   loadUserProfile(userId: string): Observable<UserProfile | null> {
//     const userRef = doc(this.firestore, `users/${userId}`);
    
//     return from(
//       getDoc(userRef).then(snapshot => {
//         if (snapshot.exists()) {
//           const data = snapshot.data();
//           return {
//             ...data,
//             createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
//             lastLogin: data['lastLogin']?.toDate ? data['lastLogin'].toDate() : new Date(data['lastLogin'])
//           } as UserProfile;
//         }
//         return null;
//       })
//     );
//   }

//   // Progress Operations
//   saveProgress(userId: string, progress: UserProgress): Observable<void> {
//     const progressRef = doc(this.firestore, `users/${userId}/data/progress`);
//     return from(setDoc(progressRef, progress));
//   }

//   loadProgress(userId: string): Observable<UserProgress | null> {
//     const progressRef = doc(this.firestore, `users/${userId}/data/progress`);
    
//     return from(
//       getDoc(progressRef).then(snapshot => {
//         if (snapshot.exists()) {
//           return snapshot.data() as UserProgress;
//         }
//         return null;
//       }).catch(error => {
//         console.error('[FirebaseDatabase] Failed to load progress:', error);
//         return null;
//       })
//     );
//   }

//   subscribeToProgress(
//     userId: string,
//     callback: (progress: UserProgress | null) => void
//   ): UnsubscribeFunction {
//     const progressRef = doc(this.firestore, `users/${userId}/data/progress`);
    
//     return onSnapshot(progressRef, (snapshot) => {
//       if (snapshot.exists()) {
//         callback(snapshot.data() as UserProgress);
//       } else {
//         callback(null);
//       }
//     });
//   }

//   // Favorites Operations
//   saveFavorites(userId: string, favorites: FavoriteData[]): Observable<void> {
//     const favoritesRef = doc(this.firestore, `users/${userId}/data/favorites`);
    
//     return from(
//       setDoc(favoritesRef, { favorites }).then(() => {
//         console.log('[FirebaseDatabase] Successfully saved favorites');
//       })
//     );
//   }

//   loadFavorites(userId: string): Observable<FavoriteData[] | null> {
//     const favoritesRef = doc(this.firestore, `users/${userId}/data/favorites`);
    
//     return from(
//       getDoc(favoritesRef).then(snapshot => {
//         if (snapshot.exists()) {
//           const data = snapshot.data();
//           const favorites = (data['favorites'] || []).map((f: any) => ({
//             ...f,
//             addedAt: f.addedAt?.toDate ? f.addedAt.toDate() : new Date(f.addedAt)
//           }));
//           return favorites;
//         }
//         return null;
//       })
//     );
//   }

//   subscribeToFavorites(
//     userId: string,
//     callback: (favorites: FavoriteData[] | null) => void
//   ): UnsubscribeFunction {
//     const favoritesRef = doc(this.firestore, `users/${userId}/data/favorites`);
    
//     return onSnapshot(favoritesRef, (snapshot) => {
//       if (snapshot.exists()) {
//         const data = snapshot.data();
//         const favorites = (data['favorites'] || []).map((f: any) => ({
//           ...f,
//           addedAt: f.addedAt?.toDate ? f.addedAt.toDate() : new Date(f.addedAt)
//         }));
//         callback(favorites);
//       } else {
//         callback(null);
//       }
//     });
//   }

//   // Custom Exercise Operations
//   saveCustomExercise(userId: string, exercise: CustomExercise): Observable<void> {
//     const exerciseRef = doc(this.firestore, `users/${userId}/customExercises/${exercise.id}`);
    
//     const exerciseData = {
//       ...exercise,
//       createdAt: exercise.createdAt,
//       updatedAt: exercise.updatedAt
//     };
    
//     return from(
//       setDoc(exerciseRef, exerciseData).then(() => {
//         console.log('[FirebaseDatabase] Successfully saved custom exercise');
//       })
//     );
//   }

//   loadCustomExercises(userId: string): Observable<CustomExercise[]> {
//     const exercisesRef = collection(this.firestore, `users/${userId}/customExercises`);
    
//     return from(
//       getDocs(exercisesRef).then(snapshot => {
//         const exercises: CustomExercise[] = [];
        
//         snapshot.forEach(doc => {
//           const data = doc.data();
//           exercises.push({
//             ...data,
//             id: doc.id,
//             createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
//             updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt'])
//           } as CustomExercise);
//         });
        
//         return exercises;
//       }).catch(error => {
//         console.error('[FirebaseDatabase] Failed to load custom exercises:', error);
//         return [];
//       })
//     );
//   }

//   deleteCustomExercise(userId: string, exerciseId: string): Observable<void> {
//     const exerciseRef = doc(this.firestore, `users/${userId}/customExercises/${exerciseId}`);
    
//     return from(
//       deleteDoc(exerciseRef).then(() => {
//         console.log('[FirebaseDatabase] Successfully deleted custom exercise');
//       })
//     );
//   }

//   subscribeToCustomExercises(
//     userId: string,
//     callback: (exercises: CustomExercise[]) => void
//   ): UnsubscribeFunction {
//     const exercisesRef = collection(this.firestore, `users/${userId}/customExercises`);
//     const q = query(exercisesRef);
    
//     return onSnapshot(q, (snapshot) => {
//       const exercises: CustomExercise[] = [];
      
//       snapshot.forEach(doc => {
//         const data = doc.data();
//         exercises.push({
//           ...data,
//           id: doc.id,
//           createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
//           updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt'])
//         } as CustomExercise);
//       });
      
//       callback(exercises);
//     });
//   }

//   // Achievement Operations
//   saveAchievements(userId: string, data: UserAchievementData): Observable<void> {
//     const achievementsRef = doc(this.firestore, `users/${userId}/data/achievements`);
    
//     return from(
//       setDoc(achievementsRef, data).then(() => {
//         console.log('[FirebaseDatabase] Successfully saved achievements');
//       })
//     );
//   }

//   loadAchievements(userId: string): Observable<UserAchievementData | null> {
//     const achievementsRef = doc(this.firestore, `users/${userId}/data/achievements`);
    
//     return from(
//       getDoc(achievementsRef).then(snapshot => {
//         if (snapshot.exists()) {
//           const data = snapshot.data();
          
//           // Convert date strings back to Date objects
//           const achievementData: UserAchievementData = {
//             userId: data['userId'],
//             unlockedAchievements: (data['unlockedAchievements'] || []).map((ua: any) => ({
//               achievementId: ua.achievementId,
//               unlockedAt: ua.unlockedAt?.toDate ? ua.unlockedAt.toDate() : new Date(ua.unlockedAt),
//               rewardsClaimed: ua.rewardsClaimed ?? false
//             })),
//             progress: {},
//             lastEvaluated: data['lastEvaluated']?.toDate ? data['lastEvaluated'].toDate() : new Date(data['lastEvaluated'])
//           };
          
//           // Convert progress dates
//           if (data['progress']) {
//             Object.keys(data['progress']).forEach(key => {
//               const progressData = data['progress'][key];
//               achievementData.progress[key] = {
//                 ...progressData,
//                 lastUpdated: progressData.lastUpdated?.toDate ? progressData.lastUpdated.toDate() : new Date(progressData.lastUpdated)
//               };
//             });
//           }
          
//           return achievementData;
//         }
//         return null;
//       }).catch(error => {
//         console.error('[FirebaseDatabase] Failed to load achievements:', error);
//         return null;
//       })
//     );
//   }

//   // Reward Operations
//   saveRewards(userId: string, rewards: UserRewards): Observable<void> {
//     const rewardsRef = doc(this.firestore, `users/${userId}/data/rewards`);
    
//     return from(
//       setDoc(rewardsRef, rewards).then(() => {
//         console.log('[FirebaseDatabase] Successfully saved rewards');
//       })
//     );
//   }

//   loadRewards(userId: string): Observable<UserRewards | null> {
//     const rewardsRef = doc(this.firestore, `users/${userId}/data/rewards`);
    
//     return from(
//       getDoc(rewardsRef).then(snapshot => {
//         if (snapshot.exists()) {
//           const data = snapshot.data();
//           return {
//             themes: data['themes'] || [],
//             hints: data['hints'] || 0,
//             avatarFrames: data['avatarFrames'] || []
//           } as UserRewards;
//         }
//         return null;
//       }).catch(error => {
//         console.error('[FirebaseDatabase] Failed to load rewards:', error);
//         return null;
//       })
//     );
//   }
// }
