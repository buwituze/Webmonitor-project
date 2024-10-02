const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');

// PostgreSQL connection pool setup
const pool = new Pool({
  user: 'webmon',
  host: 'db',
  database: 'WebmonDB',
  password: 'safedb12!',
  port: 5432,
});

// GraphQL schema definition
const typeDefs = gql`
  type Website {
    id: ID!
    name: String!
    url: String!
    status: String!
  }

  type Query {
    websites: [Website]
    getWebsiteStatus(id: ID!): Website
  }

  type Mutation {
    addWebsite(name: String!, url: String!): Website
    deleteWebsite(id: ID!): Boolean
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    websites: async () => {
      try {
        const res = await pool.query('SELECT * FROM websites');
        return res.rows;
      } catch (err) {
        console.error(err);
        throw new Error('Error fetching websites');
      }
    },
    getWebsiteStatus: async (_, { id }) => {
      try {
        const res = await pool.query('SELECT * FROM websites WHERE id = $1', [id]);
        if (res.rows.length === 0) throw new Error('Website not found');
        return res.rows[0];
      } catch (err) {
        console.error(err);
        throw new Error('Error fetching website status');
      }
    }
  },
  Mutation: {
    addWebsite: async (_, { name, url }) => {
      try {
        const res = await pool.query(
          'INSERT INTO websites (name, url, status) VALUES ($1, $2, $3) RETURNING *',
          [name, url, 'unknown']
        );
        return res.rows[0];
      } catch (err) {
        console.error(err);
        throw new Error('Error adding website');
      }
    },
    deleteWebsite: async (_, { id }) => {
      try {
        const res = await pool.query('DELETE FROM websites WHERE id = $1 RETURNING *', [id]);
        return res.rowCount > 0;
      } catch (err) {
        console.error(err);
        throw new Error('Error deleting website');
      }
    }
  }
};

// Function to check website status periodically
const checkWebsiteStatus = async () => {
  try {
    const websites = await pool.query('SELECT * FROM websites');
    for (const website of websites.rows) {
      try {
        const response = await axios.get(website.url);
        const status = response.status === 200 ? 'online' : 'offline';
        await pool.query('UPDATE websites SET status = $1 WHERE id = $2', [status, website.id]);
      } catch (err) {
        await pool.query('UPDATE websites SET status = $1 WHERE id = $2', ['offline', website.id]);
      }
    }
  } catch (err) {
    console.error('Error checking website status:', err);
  }
};

// Set up cron job to run the status check every minute
cron.schedule('* * * * *', checkWebsiteStatus);

// Create an Apollo Server with GraphQL schema and resolvers
const apolloServer = new ApolloServer({ typeDefs, resolvers });

// Create an Express application
const app = express();

// Start the Apollo Server and apply the middleware to Express
async function startServer() {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  // Start the Express server
  app.listen({ port: 5000 }, () =>
    console.log(`🚀 Server ready at http://localhost:5000${apolloServer.graphqlPath}`)
  );
}

// Initialize the server
startServer().catch((err) => {
  console.error('Failed to start the server:', err);
});