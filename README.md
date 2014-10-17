# Prep Area

Prep Area is a Dice Masters collection manager and team builder.

# Modifying Sets

## Image Assets

Each set should have a corresponding directory under assets. For example, Avengers v. X-Men is locate in the avx directory. Inside this directory, the application assumes there will be a numbered .jpg for each card in the set. Again referencing AvX, Beast - Big Boy Blue is card #1 in the set, so its corresponding image is found in assets/avx/1.jpg. Each set will also be expected to have a logo.png file which is the image displayed in the collection view.

## Card Information

Even though we only represent a small amount of information about the cards with the current version of Prep Area, we still store every piece of information possible about the cards. We may want to use this at a later date and time.

This information is found in scripts/services/providers.js

The Sets factory has a dataVersion variable which declares the version we _expect_ the application to be current with.

Inside the factory, we have a method called seedPouch. This method both initializes the pouch database initially _and_ replaces the internal pouch database when it's out of date. In the seedData variable, you'll see a record with an _id of "metadata" that has the current version of the seed data.

The checkSeedPouch method looks at the actual pouch database on the device and compares it to the dataVersion variable in the Sets factory. If it's lower than dataVersion, we blow the pouch database away and reseed with the new version.

Inside the seedData variable in the seedPouch method, we also have records for each set that identify the name and release date.

We also have a record for each set's basic cards (so AvX has one record for all of its basics), and we have one record for each character _regardless of set_, so Angel is only in there once.

For each character, they have a sets array which contains the _id value of any set they appear in. They also have a cards array which contains a record for each individual card including information like what set that card belongs to.

# License

All Prep Area specific code is licensed under the MIT License located in this repository. All other information belongs to their respective parties.