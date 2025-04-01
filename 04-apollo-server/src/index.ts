import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLError } from 'graphql';

// Data Structures
interface Author {
  id: string;
  name: string;
  books: string[]; // Array of Book IDs
}

interface Book {
  id: string;
  title: string;
  authorId: string;
  published: number;
}

// Sample Data
let authors: Author[] = [
  { id: 'author-1', name: 'Kate Chopin', books: ['book-1'] },
  { id: 'author-2', name: 'Paul Auster', books: ['book-2', 'book-3'] },
];

let books: Book[] = [
  { id: 'book-1', title: 'The Awakening', authorId: 'author-1', published: 1899 },
  { id: 'book-2', title: 'City of Glass', authorId: 'author-2', published: 1985 },
  { id: 'book-3', title: 'The New York Trilogy', authorId: 'author-2', published: 1987 },
];

// Type Definitions (Schema)
const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    books: [Book!]!
  }

  type Book {
    id: ID!
    title: String!
    author: Author!
    published: Int!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
    author(id: ID!): Author
  }

  input CreateBookInput {
    title: String!
    authorId: ID!
    published: Int!
  }

  type Mutation {
    createBook(input: CreateBookInput!): Book!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    books: () => books,
    book: (_: any, args: { id: string }) => books.find((book) => book.id === args.id),
    authors: () => authors,
    author: (_: any, args: { id: string }) => authors.find((author) => author.id === args.id),
  },
  Book: {
    author: (parent: Book) => authors.find((author) => author.id === parent.authorId)!,
  },
  Author: {
    books: (parent: Author) => books.filter((book) => parent.books.includes(book.id)),
  },
  Mutation: {
    createBook: (_: any, args: { input: { title: string; authorId: string; published: number } }) => {
      const { title, authorId, published } = args.input;

      // Validation: Check if the author exists
      const author = authors.find((a) => a.id === authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'AUTHOR_NOT_FOUND',
            http: { status: 404 },
          },
        });
      }

      // Validation: Check if the book title already exists
      const existingBook = books.find((b) => b.title === title);
      if (existingBook) {
        throw new GraphQLError('Book with this title already exists', {
          extensions: {
            code: 'BOOK_ALREADY_EXISTS',
            http: { status: 400 },
          },
        });
      }

      const newBook: Book = {
        id: `book-${books.length + 1}`,
        title,
        authorId,
        published,
      };
      books.push(newBook);
      author.books.push(newBook.id);
      return newBook;
    },
  },
};

// Apollo Server Setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the server
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
