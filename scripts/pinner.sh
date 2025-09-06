#! /bin/bash

echo "Are you pinning hashes for an account or a collection?"
read -rp "Enter 'a' or 'c': " type

if [ "$type" != "a" ] && [ "$type" != "c" ]; then
  echo "Invalid input. Please enter 'a' or 'c'."
  exit
fi

echo "Enter the name of the account or collection you want to pin"
read -rp "Enter the name: " name

if [ ! -d hashes/accounts/"$name" ] && [ ! -d hashes/collections/"$name" ]; then
  echo "The account or collection file does not exist."
  exit
fi

if [ "$type" == "a" ]; then
  while IFS=, read -r hash; do
    ipfs pin add "$hash"
  done < hashes/accounts/"$name"/"$name".csv
fi

if [ "$type" == "c" ]; then
  while IFS=, read -r hash; do
    ipfs pin add "$hash"
  done < hashes/collections/"$name"/"$name".csv
fi

echo "The hashes have been pinned."
