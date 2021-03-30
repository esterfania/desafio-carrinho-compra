import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((item) => item.id === productId);
      let newArray: Product[] = [];

      if (productExists) {
        const stock = await api.get(`/stock/${productId}`);
        const stockAmount = stock.data.amount;
        const currentAmout = productExists.amount;

        if (currentAmout < stockAmount) {
          newArray = cart.map((i) => {
            if (i.id === productId) {
              i.amount += 1;
            }
            return i;
          });
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      } else {
        await api.get(`/products/${productId}`).then((res) => {
          newArray = [{ ...res.data, amount: 1 }, ...cart];
        });
      }
      setCart([...newArray]);
      setItemOnLocalStorage(newArray);
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProduct = cart.filter((i) => i.id === productId).length;
      if (hasProduct) {
        const products = cart.filter((r) => r.id !== productId);
        setItemOnLocalStorage(products);
        setCart([...products]);
      } else {
        throw new Error('Erro na remoção do produto');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await api.get(`/stock/${productId}`).then(async (item) => {
        const stock: Stock = item.data;
        if (amount <= stock.amount && amount > 0) {
          const products = cart.map((i) => {
            if (i.id === productId) {
              i.amount = amount;
            }
            return i;
          });
          setCart([...products]);
          setItemOnLocalStorage(cart);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      });
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

function setItemOnLocalStorage(items: Product[]) {
  localStorage.setItem('@RocketShoes:cart', JSON.stringify(items));
}
