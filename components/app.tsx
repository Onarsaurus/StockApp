import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SQLite from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

//Opens/creates the database
const openDatabase = async () => {
  const db = await SQLite.openDatabaseAsync('stock.db');

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS investments (
      investment_id INTEGER PRIMARY KEY NOT NULL,
      symbol TEXT NOT NULL,
      share_price REAL NOT NULL,
      shares INTEGER NOT NULL,
      current_share_price REAL
      );`
  );

  return db;
};

//Inserts an item into the database 
const insertInvestment = async (db, symbol, share_price, shares) => {
  const statement = await db.prepareAsync(
    'INSERT INTO investments (symbol, share_price, shares) VALUES ($symbol, $share_price, $shares)'
  );

  try {
    let result = await statement.executeAsync({ $symbol: symbol, $share_price: share_price, $shares: shares });
  } finally {
    await statement.finalizeAsync();
  }
};

//Updates an investment with the current share price
const updateCurrentSharePrice = async (db, investment_id, current_share_price) => {
  const statement = await db.prepareAsync(
    'UPDATE investments SET current_share_price = $current_share_price WHERE investment_id = $investment_id'
  );

  try {
    await statement.executeAsync({ $current_share_price: current_share_price, $investment_id: investment_id });
  } finally {
    await statement.finalizeAsync();
  }
};

//Handles investments in the list, line 206
function InvestmentItem({ item, db, onUpdate }) {
  const [currentPrice, setcurrentPrice] = React.useState(
    item.current_share_price?.toString() || ''
  );

  const validateCurrentSharePrice = async () => {
    const price = parseFloat(currentPrice);
    if (!isNaN(price) && db) {
      await updateCurrentSharePrice(db, item.investment_id, price);
      onUpdate(); //refresh
    }
  };

  return (
    <View>
      <Text style={styles.investmentTitle}>{item.symbol} Investment</Text>

      <Text style={styles.Details}>
        Price: ${item.share_price.toFixed(2)}{"\n"}
        Shares: {item.shares}{"\n"}
        Investment: ${getInvestment(item.share_price, item.shares)}
      </Text>

      <TextInput
        style={styles.ShareInput}
        placeholder="Add current share price"
        value={currentPrice}
        onChangeText={setcurrentPrice}
        onBlur={validateCurrentSharePrice}
        keyboardType="numeric"
      />

      {item.current_share_price != null && (
        <View style={styles.Result}>
          <Text style={ item.current_share_price > item.share_price 
                        ? styles.returnPositive : item.current_share_price < item.share_price 
                        ? styles.returnNegative : styles.returnNeutral}
          
          >
            Return: ${getReturn(item.share_price, item.current_share_price, item.shares)}
          </Text>
          <Image
            source={
              item.current_share_price > item.share_price 
                  ? require('@/assets/images/positive.png') 
                  : item.current_share_price < item.share_price
                  ? require('@/assets/images/negative.png')
                  : null
            }
            style={styles.Image}
          />
        </View>
  )
}
    </View >
  );
};

//Opens a link
function openLink(url) {
  WebBrowser.openBrowserAsync(url);
};

//Gets the total amount of an investment
function getInvestment(sharePrice, numberShares) {
  const investment = sharePrice * numberShares;
  return investment.toFixed(2);
};

//Gets the total return on an investment
const getReturn = (sharePrice, currentSharePrice, shares) => {
  return ((currentSharePrice - sharePrice) * shares).toFixed(2);
};

//The home screen
function HomeScreen() {
  const navigation = useNavigation();
  const [symbol, setSymbol] = React.useState('');
  const [sharePrice, setSharePrice] = React.useState('');
  const [numberShares, setnumberShares] = React.useState('');
  const [investments, setInvestments] = React.useState('');
  const [db, setDb] = React.useState(null);

  useEffect(() => {
    const initDb = async () => {
      const db = await openDatabase();
      setDb(db);
    };
    initDb();
  }, []);

  const validateAddInvestment = async () => {
    if (!db || !symbol || !sharePrice || !numberShares) return;

    await insertInvestment(
      db,
      symbol.toUpperCase().trim(),
      parseFloat(sharePrice),
      parseInt(numberShares)
    );

    navigation.navigate('Investments');
  }

  return (
    <View style={styles.HomeScreen}>
      <Text style={styles.Title}>Stock App</Text>

      <View style={styles.HomeContent}>
        <Pressable onPress={() => openLink("https://finance.yahoo.com/")}>
          <Text style={styles.Link}>Yahoo Finance</Text>
        </Pressable>

        <View style={styles.Inputs}>
          <TextInput style={styles.Input} placeholder='Stock Symbol' onChangeText={setSymbol} />
          <TextInput style={styles.Input} placeholder='Price Per Share' onChangeText={setSharePrice} keyboardType='numeric' />
          <TextInput style={styles.Input} placeholder='Number of Shares' onChangeText={setnumberShares} keyboardType='numeric' />
        </View>

        {(sharePrice && numberShares && !isNaN(parseFloat(sharePrice)) && !isNaN(parseFloat(numberShares)))
          ? <Text style={styles.Preview}>Investment total: ${(parseFloat(sharePrice) * parseFloat(numberShares)).toFixed(2)} </Text>
          : <Text style={styles.Preview}>Investment total: </Text>}

        <View style={styles.Buttons}>
          <Pressable style={styles.Button} onPress={validateAddInvestment}>
            <Text style={styles.ButtonText}>
              Add Investment
            </Text>
          </Pressable >

          <Pressable style={styles.Button} onPress={() => navigation.navigate('Investments')}>
            <Text style={styles.ButtonText}>Go to Investments</Text>
          </Pressable >
        </View>
      </View>

    </View >
  );
};

//The Investment screen
function InvestmentScreen({ route }) {
  const [investments, setInvestments] = React.useState([]);
  const [db, setDb] = React.useState(null);

  useEffect(() => {
    const getInvestments = async () => {
      const db = await openDatabase();
      setDb(db);
      const allInvestments = await db.getAllAsync('SELECT * FROM investments');
      setInvestments(allInvestments);
    };
    getInvestments();
  }, []);

  return (
    <View style={styles.InvestmentScreen}>
      <View style={styles.Summary}>
        <Text style={styles.SubTitle}>Investment History</Text>
        <FlatList
          data={investments}
          keyExtractor={item => item.investment_id.toString()}
          renderItem={({ item }) => (
            <InvestmentItem item={item} db={db} onUpdate={async () => {
              const allInvestments = await db.getAllAsync('SELECT * FROM investments');
              setInvestments(allInvestments);
            }} />
          )}
          style={styles.List}
        />
      </View>
    </View>
  );
};

//Creates stack navigator
const Stack = createNativeStackNavigator();

//Sets up the Stack/screens
function RootStack() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{
      headerStyle: {
        backgroundColor: '#0096FF',
      }
    }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '', headerShown: false }} />
      <Stack.Screen name="Investments" component={InvestmentScreen} options={{ title: 'back' }} />
    </Stack.Navigator>
  );
}

//exports/launches app
export default function App() {
  return (
    <RootStack />
  );
}

//App styles
const styles = StyleSheet.create({
  HomeScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FFFF',
  },
  HomeContent: {
    flex: 2,
    marginVertical: 30,
  },
  Title: {
    textAlign: 'center',
    fontSize: 50,
    fontWeight: 'bold',
    backgroundColor: '#0096FF',
    padding: 20,
    marginBottom: 10,
    width: 360,
  },
  InvestmentScreen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F0FFFF',
  },
  Summary: {
    borderWidth: 1,
    width: 300,
    height: 600,
    marginVertical: 10
  },
  Link: {
    fontSize: 25,
    color: 'blue',
    textDecorationLine: 'underline',
    marginBottom: 10,
    textAlign: 'center'
  },
  SubTitle: {
    textAlign: 'center',
    fontSize: 30,
    backgroundColor: '#0096FF',
    padding: 5,
    marginBottom: 10,
  },
  investmentTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold'
  },
  Preview: {
    fontSize: 25,
    width: 300,
    textAlign: 'center'
  },
  Details: {
    fontSize: 20,
    marginHorizontal: 50,
    marginVertical: 5,
  },
  Image: {
    width: 24,
    height: 24
  },
  Inputs: {
    marginHorizontal: 'auto',
    marginTop: 10,
    marginBottom: 10,
    width: 275,
  },
  Input: {
    height: 50,
    margin: 5,
    padding: 5,
    fontSize: 25,
    backgroundColor: "#ecf0f1",
    borderWidth: 1,
    borderRadius: 3,
  },
  ShareInput: {
    textAlign: 'center',
    height: 35,
    margin: 5,
    padding: 2,
    fontSize: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderRadius: 3,
  },
  Buttons: {
    marginHorizontal: 'auto',
    marginTop: 10,
    marginBottom: 10,
    width: 300,
  },
  Button: {
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0096FF',
    margin: 5,
    borderRadius: 10,
    color: 'white',
    padding: 10,
  },
  ButtonText: {
    fontSize: 25,
    textAlign: 'center',
    color: 'white',
  },
  List: {
    backgroundColor: "#ecf0f1",
  },
  returnPositive: {
    fontSize: 20,
    marginRight: 8,
    color: '#008000'
  },
  returnNegative: {
    fontSize: 20,
    marginRight: 8,
    color: '#FF0000'
  },
  returnNeutral: {
    fontSize: 20,
    marginRight: 8,
    color: '#000000'
  },
  Result: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 50,
    marginVertical: 5
  }
})