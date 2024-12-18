# User Aceptance Testing (UAT)


## Feature: Reccomendation Algorithm with no reccomendations
Test Case:\
User who has no friends or likes will not be shown any reccomendations

Test Description (localhost):\
User Joe: Logins in  
Action: Navigate towards recommendation section\
Results: Shows zero or no under recommendations for Joe\
Aceptance Criteria: Joe has no friends or liked books\
User Aceptance Tester: Users


## Feature: Display Book info-
Test Case:\
User will click on Book info & see discription

Test Description (localhost):\
User Jane: Logins in\
Action: User clicks on a book\
Results: Page will display Title, Author, Date Released, & Bio of Book\
Aceptance Criteria: Book Info Page needs to be visible\
User Aceptance Tester: Users

## Feature: Recommended Books on Discover Page
The "Recommended Books" feature on the Discover page is designed to 
offer users personalized book suggestions based on genres they frequently read and books their friends have recently enjoyed. 
This test plan ensures that the feature functions as intended, using a series of specific test cases to verify expected behaviors. 
For example, logging in as different users with distinct genre preferences or social connections will help confirm that 
the Discover page displays at least five recommendations tailored to the user’s favorite genres and friends' recent reads. 
Testing will include cases such as providing genre-based recommendations alone, recommendations based solely on friends' 
recent books, and a combination of both types, where available. 
Additionally, new users or those with no friend activity should see a clear “No recommendations available” message to 
indicate that no relevant data is present.

The testing environment will be localhost, closely mirroring the production setup to maintain accuracy and avoid disrupting 
live data, and will cover multiple browsers like Chrome, Firefox, and Safari to 
ensure cross-platform compatibility. 
Expected results include correctly displaying personalized book recommendations based on either genre or friends’ 
recent activity, as well as an appropriate fallback message for users without relevant data. Testers for 
this feature will consist of two frequent users who are familiar with the recommendation feature and one new 
user who can provide a fresh perspective. They will carefully follow each test case, note any issues or 
unexpected behaviors, and confirm that the recommendations meet expectations based on their reading history or 
friends’ activity. This testing will ensure the "Recommended Books" feature is reliable, accurate, and improves
engagement on the Discover page by providing relevant content.
