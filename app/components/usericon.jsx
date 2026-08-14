import { Image, StyleSheet, Text, View } from "react-native";

const Usericon = () => {
  return (
    <View style={styles.container}>
      <View>
        <Image
          source={{
            uri: "https://c8.alamy.com/comp/FK16W8/neymar-jr-in-action-during-the-la-liga-match-fc-barcelona-atltico-FK16W8.jpg",
          }}
          style={styles.image}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>Hello Maaz</Text>
        <Text style={styles.greating}>Good Evening</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    marginTop: 10,
    padding: 20,
    flexDirection: "row",
    // alignItems: "center",
    alignContent: "center",
    gap: 20,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  content: {},
  name: {
    color: "#f44646",
    fontSize: 20,
  },
  greating: {
    color: "#fff",
    fontSize: 16,
  },
});

export default Usericon;
